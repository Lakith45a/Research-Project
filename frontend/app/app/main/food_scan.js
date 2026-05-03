import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  FlatList,
  SafeAreaView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import { Camera, ImageIcon, ChevronRight, ChevronLeft, Search, AlertCircle } from 'lucide-react-native';
import { getPredictUrl, getNutritionUrl, getFoodsUrl, FOOD_SERVER_URL } from '../../lib/foodApi';
import { setFoodScanResult, clearFoodScanResult } from '../../lib/foodScanStore';

const MIN_ANALYZING_MS = 1200;
const ADDED_FOODS_KEY = '@medisense_added_foods';

export default function FoodScanScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState('pick'); // pick | preview | analyzing | notDetected | foods
  const [imageUri, setImageUri] = useState(null);
  const [foods, setFoods] = useState([]);
  const [serverNutritionMap, setServerNutritionMap] = useState({});
  const [noFoodMessage, setNoFoodMessage] = useState(null);
  const [modelSource, setModelSource] = useState('');
  const [allFoodNames, setAllFoodNames] = useState([]);
  const [addedFoodNames, setAddedFoodNames] = useState([]); // user-added / corrected names, persisted
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('list'); // list | custom
  const [correctingIdx, setCorrectingIdx] = useState(null);
  const [isAddingFood, setIsAddingFood] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customFoodName, setCustomFoodName] = useState('');

  const resetState = useCallback(() => {
    setImageUri(null);
    setFoods([]);
    setServerNutritionMap({});
    setNoFoodMessage(null);
    setModelSource('');
    setPhase('pick');
    setCorrectingIdx(null);
    setIsAddingFood(false);
    setSearchQuery('');
    setCustomFoodName('');
  }, []);

  // When user returns to this screen (e.g. from main or after "Scan another"), clear old data so we don't show cached result
  useFocusEffect(
    useCallback(() => {
      clearFoodScanResult();
      resetState();
    }, [resetState])
  );

  // Load persisted "newly added" food names so they appear in the change-food list
  useEffect(() => {
    AsyncStorage.getItem(ADDED_FOODS_KEY).then((raw) => {
      if (raw) {
        try {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) setAddedFoodNames(list);
        } catch (_) {}
      }
    });
  }, []);

  const openCamera = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Camera Not Available on Web',
        'Web uses file upload instead. Open this app in Expo Go on your phone to use the camera directly.'
      );
      await pickFromGallery();
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access in Settings.');
      return;
    }
    resetState();
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setPhase('preview');
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo library access in Settings.');
      return;
    }
    resetState();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setPhase('preview');
    }
  };

  const analyzeMeal = async () => {
    if (!imageUri) return;
    setPhase('analyzing');
    setNoFoodMessage(null);
    const start = Date.now();

    try {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        // Web must send a Blob/File; RN-style { uri, name, type } becomes plain form text.
        const imageResponse = await fetch(imageUri);
        const imageBlob = await imageResponse.blob();
        formData.append('file', imageBlob, 'food.jpg');
      } else {
        formData.append('file', {
          uri: imageUri,
          name: 'food.jpg',
          type: 'image/jpeg',
        });
      }

      const response = await fetch(getPredictUrl(), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server ${response.status}: ${errText.slice(0, 80)}`);
      }

      const data = await response.json();
      const detectedFoods = [];
      const nutritionOverrides = {};

      if (data.recognized && data.is_plate && Array.isArray(data.foods_detected)) {
        for (const food of data.foods_detected) {
          detectedFoods.push({ name: food.name, portion: '100' });
          const n = food.nutrition_per_100g;
          if (n) {
            nutritionOverrides[food.name] = {
              calories: Number(n.calories) || 0,
              carbs: Number(n.carbs) || 0,
              protein: Number(n.protein) || 0,
              fat: Number(n.fat) || 0,
              sodium: Number(n.sodium) || 0,
            };
          }
        }
      } else if (data.recognized && data.name && data.nutrition) {
        detectedFoods.push({ name: data.name, portion: '100' });
        const n = data.nutrition;
        nutritionOverrides[data.name] = {
          calories: Number(n.calories) || 0,
          carbs: Number(n.carbs) || 0,
          protein: Number(n.protein) || 0,
          fat: Number(n.fat) || 0,
          sodium: Number(n.sodium) || 0,
        };
      } else if (!data.recognized) {
        const msg = data.message || 'Could not identify any food in this image.';
        const wait = Math.max(0, MIN_ANALYZING_MS - (Date.now() - start));
        setNoFoodMessage(msg);
        setTimeout(() => setPhase('notDetected'), wait);
        return;
      }

      if (detectedFoods.length === 0) {
        const msg = 'No food items were detected. Please try again.';
        const wait = Math.max(0, MIN_ANALYZING_MS - (Date.now() - start));
        setNoFoodMessage(msg);
        setTimeout(() => setPhase('notDetected'), wait);
        return;
      }

      setServerNutritionMap(nutritionOverrides);
      setFoods(detectedFoods);
      setModelSource(data.model_source || '');
      const wait = Math.max(0, MIN_ANALYZING_MS - (Date.now() - start));
      setTimeout(() => setPhase('foods'), wait);
    } catch (err) {
      const isNetwork = /network|fetch|connect|timeout/i.test(err?.message || '');
      Alert.alert(
        isNetwork ? 'Server Unavailable' : 'Analysis Error',
        isNetwork
          ? "Couldn't connect to the server. Check your connection and that the backend is running."
          : (err?.message || 'Something went wrong.'),
        [{ text: 'OK', onPress: () => setPhase('preview') }]
      );
    }
  };

  const fetchFoodsList = async () => {
    try {
      const res = await fetch(getFoodsUrl());
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.foods)) setAllFoodNames(data.foods);
      }
    } catch (_) {}
  };

  const openCorrectModal = (idx) => {
    setCorrectingIdx(idx);
    setIsAddingFood(false);
    setSearchQuery('');
    setCustomFoodName('');
    setModalMode('list');
    fetchFoodsList();
    setModalVisible(true);
  };

  const openAddFoodModal = () => {
    setIsAddingFood(true);
    setCorrectingIdx(null);
    setSearchQuery('');
    setCustomFoodName('');
    setModalMode('list');
    fetchFoodsList();
    setModalVisible(true);
  };

  const addToAddedFoodsList = useCallback((name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setAddedFoodNames((prev) => {
      const next = [trimmed, ...prev.filter((n) => n.trim().toLowerCase() !== trimmed.toLowerCase())];
      AsyncStorage.setItem(ADDED_FOODS_KEY, JSON.stringify(next.slice(0, 100)));
      return next;
    });
  }, []);

  const correctFood = async (idx, newName) => {
    const oldName = foods[idx]?.name;
    setFoods((prev) => prev.map((f, i) => (i === idx ? { ...f, name: newName } : f)));
    addToAddedFoodsList(newName);
    const { [oldName]: _, ...rest } = serverNutritionMap;
    setServerNutritionMap(rest);
    try {
      const res = await fetch(getNutritionUrl(newName));
      if (res.ok) {
        const data = await res.json();
        if (data.nutrition && data.nutrition_available !== false) {
          setServerNutritionMap((prev) => ({ ...prev, [newName]: data.nutrition }));
        }
      }
    } catch (_) {}
    setModalVisible(false);
    setCorrectingIdx(null);
    setIsAddingFood(false);
  };

  const addNewFood = async (foodName) => {
    const name = (foodName || customFoodName || '').trim();
    if (!name) return;
    addToAddedFoodsList(name);
    setFoods((prev) => [...prev, { name, portion: '100' }]);
    try {
      const res = await fetch(getNutritionUrl(name));
      if (res.ok) {
        const data = await res.json();
        if (data.nutrition && data.nutrition_available !== false) {
          setServerNutritionMap((prev) => ({ ...prev, [name]: data.nutrition }));
        }
      }
    } catch (_) {}
    setModalVisible(false);
    setCustomFoodName('');
    setIsAddingFood(false);
  };

  const updatePortion = (idx, value) => {
    setFoods((prev) => prev.map((f, i) => (i === idx ? { ...f, portion: value } : f)));
  };

  const deleteFood = (idx) => {
    const name = foods[idx]?.name;
    setFoods((prev) => prev.filter((_, i) => i !== idx));
    if (name) {
      const { [name]: _, ...rest } = serverNutritionMap;
      setServerNutritionMap(rest);
    }
  };

  const goToResult = () => {
    setFoodScanResult(foods, serverNutritionMap, imageUri);
    router.push('/main/food_result');
  };

  // Change-food list = newly added (persisted) + current session foods + server list, deduplicated
  const listForModal = [
    ...addedFoodNames,
    ...foods.map((f) => f.name).filter(Boolean),
    ...allFoodNames,
  ].filter((name, i, arr) => arr.findIndex((n) => n.toLowerCase() === (name || '').toLowerCase()) === i);
  const searchList = listForModal.filter((f) =>
    (f || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  // —— Phase: PICK ——
  if (phase === 'pick') {
    return (
      <View className="flex-1 bg-[#0f172a]">
        <SafeAreaView className="flex-1">
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
            <Text className="text-white text-xl font-bold mb-1">Food Scan</Text>
            <Text className="text-slate-400 text-sm mb-6">Take a photo or choose from gallery</Text>

            <TouchableOpacity
              className="bg-white/5 border border-white/10 rounded-2xl p-5 flex-row items-center mb-4"
              onPress={openCamera}
              activeOpacity={0.85}
            >
              <View className="w-14 h-14 bg-sky-500/20 rounded-2xl items-center justify-center mr-4">
                <Camera color="#38bdf8" size={28} />
              </View>
              <View className="flex-1">
                <Text className="text-white text-lg font-bold">Use Camera</Text>
                <Text className="text-slate-500 text-xs">Take a photo of your meal</Text>
              </View>
              <ChevronRight color="#64748b" size={20} />
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white/5 border border-white/10 rounded-2xl p-5 flex-row items-center"
              onPress={pickFromGallery}
              activeOpacity={0.85}
            >
              <View className="w-14 h-14 bg-emerald-500/20 rounded-2xl items-center justify-center mr-4">
                <ImageIcon color="#34d399" size={28} />
              </View>
              <View className="flex-1">
                <Text className="text-white text-lg font-bold">Upload from Gallery</Text>
                <Text className="text-slate-500 text-xs">Choose an existing photo</Text>
              </View>
              <ChevronRight color="#64748b" size={20} />
            </TouchableOpacity>

            <View className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 mt-8 flex-row">
              <AlertCircle color="#38bdf8" size={20} style={{ marginRight: 10 }} />
              <Text className="text-slate-300 text-sm flex-1">
                For best results use good lighting and avoid partial views.
              </Text>
            </View>

            <TouchableOpacity
              className="py-4 items-center mt-4"
              onPress={() => router.push('/main/food_history?from=scan')}
            >
              <Text className="text-emerald-400 font-medium">View saved meal history</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // —— Phase: PREVIEW ——
  if (phase === 'preview') {
    return (
      <View className="flex-1 bg-[#0f172a]">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/10">
            <TouchableOpacity onPress={() => setPhase('pick')} className="p-2">
              <ChevronLeft color="#38bdf8" size={24} />
            </TouchableOpacity>
            <Text className="text-white font-bold text-lg">Preview</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
            {imageUri && (
              <View className="rounded-2xl overflow-hidden bg-white/5 mb-6">
                <Image source={{ uri: imageUri }} className="w-full aspect-square" resizeMode="cover" />
              </View>
            )}
            <Text className="text-white font-bold text-lg mb-2">Ready to analyse?</Text>
            <Text className="text-slate-400 text-sm mb-6">The AI will detect food items and estimate nutrition.</Text>
            <TouchableOpacity
              className="bg-sky-500 rounded-2xl py-4 flex-row items-center justify-center"
              onPress={analyzeMeal}
              activeOpacity={0.88}
            >
              <Search color="#fff" size={20} style={{ marginRight: 8 }} />
              <Text className="text-white font-bold text-base">Analyse Meal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="py-4 items-center mt-2"
              onPress={() => {
                resetState();
              }}
            >
              <Text className="text-slate-400">Choose a different image</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // —— Phase: ANALYZING ——
  if (phase === 'analyzing') {
    return (
      <View className="flex-1 bg-[#0f172a] justify-center items-center">
        <SafeAreaView className="flex-1 justify-center items-center">
          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              className="w-32 h-32 rounded-2xl mb-6"
              resizeMode="cover"
            />
          )}
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text className="text-white font-bold text-lg mt-4">Detecting foods…</Text>
          <Text className="text-slate-400 text-sm mt-2">{FOOD_SERVER_URL}</Text>
        </SafeAreaView>
      </View>
    );
  }

  // —— Phase: NOT DETECTED ——
  if (phase === 'notDetected') {
    return (
      <View className="flex-1 bg-[#0f172a]">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/10">
            <TouchableOpacity
              onPress={() => {
                setPhase('preview');
                setNoFoodMessage(null);
              }}
              className="p-2"
            >
              <ChevronLeft color="#38bdf8" size={24} />
            </TouchableOpacity>
            <Text className="text-white font-bold text-lg">Result</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
            {imageUri && (
              <Image source={{ uri: imageUri }} className="w-40 h-40 rounded-2xl mb-6" resizeMode="cover" />
            )}
            <View className="bg-white/5 border border-white/10 rounded-2xl p-6 items-center">
              <AlertCircle color="#f87171" size={48} style={{ marginBottom: 12 }} />
              <Text className="text-white font-bold text-lg mb-2">No food detected</Text>
              <Text className="text-slate-400 text-center text-sm mb-6">{noFoodMessage || 'Could not identify any food.'}</Text>
              <TouchableOpacity
                className="bg-sky-500 rounded-2xl py-3 px-6"
                onPress={() => {
                  setPhase('preview');
                  setNoFoodMessage(null);
                }}
              >
                <Text className="text-white font-bold">Try again</Text>
              </TouchableOpacity>
              <TouchableOpacity className="mt-4" onPress={resetState}>
                <Text className="text-slate-400">Choose a different image</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // —— Phase: FOODS (list + modal for correct/add) ——
  const filteredList = searchList.length > 0 ? searchList : [customFoodName.trim()].filter(Boolean);

  return (
    <View className="flex-1 bg-[#0f172a]">
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-[#1e293b] rounded-t-3xl max-h-[80%]">
            <View className="flex-row items-center justify-between p-4 border-b border-white/10">
              <Text className="text-white font-bold text-lg">
                {isAddingFood ? 'Add Food' : 'Change Food'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text className="text-sky-400 font-bold">Done</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row border-b border-white/10 px-2">
              <TouchableOpacity
                className={`flex-1 py-3 ${modalMode === 'list' ? 'border-b-2 border-sky-500' : ''}`}
                onPress={() => setModalMode('list')}
              >
                <Text className={modalMode === 'list' ? 'text-sky-400 font-bold text-center' : 'text-slate-400 text-center'}>
                  From list
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-3 ${modalMode === 'custom' ? 'border-b-2 border-sky-500' : ''}`}
                onPress={() => setModalMode('custom')}
              >
                <Text className={modalMode === 'custom' ? 'text-sky-400 font-bold text-center' : 'text-slate-400 text-center'}>
                  Type name
                </Text>
              </TouchableOpacity>
            </View>
            {modalMode === 'list' && (
              <>
                <View className="flex-row items-center bg-white/5 rounded-xl mx-4 my-2 px-3 py-2">
                  <Search color="#64748b" size={18} />
                  <TextInput
                    className="flex-1 text-white ml-2 py-1"
                    placeholder="Search foods..."
                    placeholderTextColor="#64748b"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                <FlatList
                  data={filteredList}
                  keyExtractor={(item) => item}
                  keyboardShouldPersistTaps="handled"
                  className="max-h-64"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      className="px-4 py-3 border-b border-white/5"
                      onPress={() => {
                        if (isAddingFood) addNewFood(item);
                        else if (correctingIdx !== null) correctFood(correctingIdx, item);
                      }}
                    >
                      <Text className="text-white">{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </>
            )}
            {modalMode === 'custom' && (
              <View className="p-4">
                <TextInput
                  className="bg-white/5 rounded-xl px-4 py-3 text-white border border-white/10 mb-4"
                  placeholder="e.g. Rice, Curry..."
                  placeholderTextColor="#64748b"
                  value={customFoodName}
                  onChangeText={setCustomFoodName}
                />
                <TouchableOpacity
                  className="bg-sky-500 rounded-xl py-3 items-center disabled:opacity-50"
                  disabled={!customFoodName.trim()}
                  onPress={() => {
                    const name = customFoodName.trim();
                    if (isAddingFood) {
                      addNewFood(name);
                    } else if (correctingIdx !== null) {
                      correctFood(correctingIdx, name);
                    }
                  }}
                >
                  <Text className="text-white font-bold">
                    {isAddingFood ? 'Add Food' : 'Confirm'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/10">
        <TouchableOpacity onPress={() => setPhase('preview')} className="p-2">
          <ChevronLeft color="#38bdf8" size={24} />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg">Detected Foods</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        {imageUri && (
          <View className="mb-6">
            <View className="rounded-2xl overflow-hidden bg-white/5 border border-white/10">
              <Image
                source={{ uri: imageUri }}
                className="w-full h-72 rounded-2xl"
                resizeMode="cover"
              />
            </View>
            <View className="flex-row items-center justify-between mt-3">
              <Text className="text-white font-bold">Analysis complete</Text>
              <Text className="text-slate-400 text-sm">{foods.length} item{foods.length !== 1 ? 's' : ''} detected</Text>
            </View>
            {modelSource ? <Text className="text-slate-500 text-xs mt-1">{modelSource}</Text> : null}
            <Text className="text-slate-400 text-xs mt-2">Use the image above to add or correct foods.</Text>
          </View>
        )}

        <Text className="text-white font-bold mb-2">Adjust portions (g)</Text>
        <Text className="text-slate-400 text-sm mb-4">Edit weight for each item, then tap Calculate Nutrition.</Text>

        {foods.map((food, idx) => (
          <View key={`${food.name}-${idx}`} className="bg-white/5 border border-white/10 rounded-xl p-4 mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-white font-bold flex-1" numberOfLines={1}>{food.name}</Text>
              <TouchableOpacity onPress={() => openCorrectModal(idx)} className="p-2">
                <Text className="text-sky-400 text-sm font-bold">Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteFood(idx)} className="p-2">
                <Text className="text-red-400 text-sm">Remove</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center">
              <Text className="text-slate-400 text-sm mr-2">Weight (g)</Text>
              <TextInput
                className="flex-1 bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2 text-white"
                keyboardType="numeric"
                value={food.portion}
                onChangeText={(v) => updatePortion(idx, v)}
                placeholder="100"
                placeholderTextColor="#64748b"
              />
            </View>
          </View>
        ))}

        <TouchableOpacity
          className="bg-white/5 border border-dashed border-sky-500/50 rounded-xl p-4 flex-row items-center mt-2"
          onPress={openAddFoodModal}
        >
          <Text className="text-sky-400 font-bold mr-2">+</Text>
          <Text className="text-sky-400 font-bold">Add another food</Text>
        </TouchableOpacity>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-[#0f172a] border-t border-white/10">
        <TouchableOpacity
          className="bg-sky-500 rounded-2xl py-4 items-center"
          onPress={goToResult}
          activeOpacity={0.88}
        >
          <Text className="text-white font-bold text-base">Calculate Nutrition</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
