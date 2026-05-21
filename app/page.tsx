"use client";

import React, { useState, useEffect, useRef } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import { 
  Camera, 
  Plus, 
  Trash2, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Sparkles, 
  Loader2, 
  Check, 
  X,
  Flame,
  Apple,
  Dumbbell,
  Beef
} from "lucide-react";
import { 
  getUserGoals, 
  updateUserGoals, 
  getDailyLog, 
  addMealToLog, 
  deleteMealFromLog,
  Meal,
  UserGoals
} from "./actions";

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000; // local offset in ms
    const localISODate = new Date(today.getTime() - tzOffset).toISOString().split("T")[0];
    return localISODate;
  });

  // State for goals and daily logs
  const [goals, setGoals] = useState<UserGoals>({
    targetCalories: 2000,
    targetCarbs: 225,
    targetProtein: 130,
    targetFats: 65
  });
  
  const [log, setLog] = useState<{
    meals: Meal[];
    totalCalories: number;
    totalCarbs: number;
    totalProtein: number;
    totalFats: number;
  }>({
    meals: [],
    totalCalories: 0,
    totalCarbs: 0,
    totalProtein: 0,
    totalFats: 0
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStatus, setScanStatus] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for goal editing
  const [formCalories, setFormCalories] = useState<string>("2000");
  const [formCarbs, setFormCarbs] = useState<string>("225");
  const [formProtein, setFormProtein] = useState<string>("130");
  const [formFats, setFormFats] = useState<string>("65");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch data from database
  const fetchData = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const userGoals = await getUserGoals();
      setGoals(userGoals);
      
      // Update form values
      setFormCalories(userGoals.targetCalories.toString());
      setFormCarbs(userGoals.targetCarbs.toString());
      setFormProtein(userGoals.targetProtein.toString());
      setFormFats(userGoals.targetFats.toString());

      const dailyLog = await getDailyLog(selectedDate);
      setLog(dailyLog);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      showToast("Error loading tracker data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      fetchData();
    }
  }, [user, isLoaded, selectedDate]);

  // Toast notifier helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Date Navigation handlers
  const adjustDate = (days: number) => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + days);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISODate = new Date(d.getTime() - tzOffset).toISOString().split("T")[0];
    setSelectedDate(localISODate);
  };

  const getFriendlyDateString = () => {
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    const todayStr = new Date(today.getTime() - tzOffset).toISOString().split("T")[0];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = new Date(yesterday.getTime() - tzOffset).toISOString().split("T")[0];

    if (selectedDate === todayStr) {
      return "Today";
    } else if (selectedDate === yesterdayStr) {
      return "Yesterday";
    } else {
      const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
      return new Date(selectedDate + "T00:00:00").toLocaleDateString('en-US', options);
    }
  };

  // Goal Form submit handler
  const handleUpdateGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cal = parseInt(formCalories) || 2000;
      const carb = parseInt(formCarbs) || 225;
      const prot = parseInt(formProtein) || 130;
      const fat = parseInt(formFats) || 65;

      const updated = await updateUserGoals(cal, carb, prot, fat);
      setGoals(updated);
      setIsModalOpen(false);
      showToast("Targets updated successfully!");
    } catch (error) {
      console.error("Failed to update goals:", error);
      showToast("Failed to save goals.");
    }
  };

  // Image Upload and Analysis Handler
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanning(true);
      setScanStatus("Compressing photo...");

      // Convert to Base64 with compression (via canvas resizing if needed or direct reader)
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64Data = reader.result as string;
        
        setScanStatus("Gemini is analyzing food & portions...");
        
        const res = await fetch("/api/analyze-food", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image: base64Data }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed food analysis");
        }

        const analysis = await res.json();
        
        setScanStatus("Logging meal to your calendar...");
        
        await addMealToLog(selectedDate, {
          description: analysis.description,
          calories: analysis.calories,
          protein: analysis.protein,
          carbs: analysis.carbs,
          fats: analysis.fats,
        });

        // Re-fetch log data
        const updatedLog = await getDailyLog(selectedDate);
        setLog(updatedLog);

        showToast(`Logged: ${analysis.description.substring(0, 30)}... (+${analysis.calories} kcal)`);
        setIsScanning(false);
      };

      reader.onerror = () => {
        throw new Error("Failed to read image file");
      };

    } catch (error: any) {
      console.error("Logging failed:", error);
      showToast(error.message || "Failed to analyze image. Please try again.");
      setIsScanning(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // clear file picker
      }
    }
  };

  // Meal deletion handler
  const handleDeleteMeal = async (mealId: string) => {
    if (!confirm("Are you sure you want to delete this meal?")) return;
    try {
      await deleteMealFromLog(selectedDate, mealId);
      const updatedLog = await getDailyLog(selectedDate);
      setLog(updatedLog);
      showToast("Meal deleted.");
    } catch (error) {
      console.error("Failed to delete meal:", error);
      showToast("Failed to delete meal.");
    }
  };

  // Math Helpers for Circular Progress Ring
  const caloriePercentage = Math.min(100, Math.round((log.totalCalories / goals.targetCalories) * 100)) || 0;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (caloriePercentage / 100) * circumference;

  // Percentage Calculations for Macros
  const carbPercent = Math.min(100, (log.totalCarbs / goals.targetCarbs) * 100) || 0;
  const protPercent = Math.min(100, (log.totalProtein / goals.targetProtein) * 100) || 0;
  const fatPercent = Math.min(100, (log.totalFats / goals.targetFats) * 100) || 0;

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
          <p className="text-slate-400 text-sm animate-pulse">Loading Free Fitness...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative pb-24 overflow-x-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-emerald-500/30 shadow-xl shadow-emerald-950/20 text-emerald-400 px-4 py-3 rounded-full text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[30%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[50%] h-[30%] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

      {/* Header component */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/10">
            <span className="text-white text-base font-black tracking-tighter">F</span>
          </div>
          <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
            Free Fitness
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          <UserButton />
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4 flex flex-col gap-6">
        {/* Date Selector */}
        <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-2.5 flex items-center justify-between shadow-sm">
          <button
            onClick={() => adjustDate(-1)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 active:scale-95 transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Calendar className="h-4 w-4 text-emerald-400" />
            <span>{getFriendlyDateString()}</span>
          </div>
          <button
            onClick={() => adjustDate(1)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 active:scale-95 transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Circular Calorie Card */}
        <div className="bg-slate-900 border border-slate-850/60 rounded-3xl p-6 flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
          <div className="absolute top-2 right-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
            <Flame className="h-3 w-3 text-orange-500" /> Calories
          </div>
          
          <div className="relative flex items-center justify-center">
            {/* SVG Progress Ring */}
            <svg className="w-48 h-48 transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r={radius}
                className="stroke-slate-800"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="96"
                cy="96"
                r={radius}
                className="stroke-emerald-500 transition-all duration-500 ease-out"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-center flex flex-col">
              <span className="text-3xl font-black tracking-tight">{log.totalCalories}</span>
              <span className="text-xs text-slate-500 font-medium mt-0.5">/ {goals.targetCalories} kcal</span>
              <span className="text-[10px] mt-1 bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded-full inline-block self-center">
                {caloriePercentage}% Goal
              </span>
            </div>
          </div>
        </div>

        {/* Macro Progress Cards */}
        <div className="grid grid-cols-3 gap-3">
          {/* Carbs */}
          <div className="bg-slate-900 border border-slate-850/60 rounded-2xl p-3.5 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Apple className="h-4 w-4 text-cyan-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Carbs</span>
            </div>
            <div>
              <span className="text-base font-extrabold">{log.totalCarbs}g</span>
              <span className="text-[10px] text-slate-500 font-medium"> / {goals.targetCarbs}g</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-cyan-400 to-cyan-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${carbPercent}%` }}
              />
            </div>
          </div>

          {/* Protein */}
          <div className="bg-slate-900 border border-slate-850/60 rounded-2xl p-3.5 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Beef className="h-4 w-4 text-purple-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Protein</span>
            </div>
            <div>
              <span className="text-base font-extrabold">{log.totalProtein}g</span>
              <span className="text-[10px] text-slate-500 font-medium"> / {goals.targetProtein}g</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-400 to-purple-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${protPercent}%` }}
              />
            </div>
          </div>

          {/* Fats */}
          <div className="bg-slate-900 border border-slate-850/60 rounded-2xl p-3.5 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Dumbbell className="h-4 w-4 text-amber-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Fats</span>
            </div>
            <div>
              <span className="text-base font-extrabold">{log.totalFats}g</span>
              <span className="text-[10px] text-slate-500 font-medium"> / {goals.targetFats}g</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${fatPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Timeline / Meal History */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-extrabold uppercase tracking-widest text-slate-400">Today's Meals</span>
            <span className="text-xs font-semibold text-slate-500">{log.meals.length} Logged</span>
          </div>

          {log.meals.length === 0 ? (
            <div className="bg-slate-900/30 border border-dashed border-slate-850 rounded-2xl py-12 px-4 text-center flex flex-col items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-500">
                <Apple className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-slate-400">No meals logged yet</p>
                <p className="text-xs text-slate-500">Snap a photo of your food to start tracking.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {log.meals.map((meal) => {
                const timeString = new Date(meal.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div 
                    key={meal.id} 
                    className="bg-slate-900 border border-slate-850/60 rounded-2xl p-4 flex flex-col gap-3 relative hover:border-slate-800 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-sm font-semibold text-slate-200 leading-tight">{meal.description}</p>
                        <span className="text-[10px] text-slate-500 font-medium">{timeString}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteMeal(meal.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 active:scale-90 hover:bg-slate-800 transition self-start"
                        title="Delete meal"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-850/40 pt-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                        <span className="text-xs font-black">{meal.calories}</span>
                        <span className="text-[10px] text-slate-500 font-medium">kcal</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 font-medium">C</span>
                          <span className="text-xs font-bold text-cyan-400">{meal.carbs}g</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 font-medium">P</span>
                          <span className="text-xs font-bold text-purple-400">{meal.protein}g</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 font-medium">F</span>
                          <span className="text-xs font-bold text-amber-400">{meal.fats}g</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Camera Capture FAB */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          id="camera-input"
          onChange={handleImageChange}
          ref={fileInputRef}
        />
        <label
          htmlFor="camera-input"
          className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center cursor-pointer shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all group"
        >
          <Camera className="h-7 w-7 text-white group-hover:rotate-6 transition duration-200" />
        </label>
      </div>

      {/* Gemini AI Scanning Overlay */}
      {isScanning && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="relative flex flex-col items-center gap-6">
            {/* Glowing Scan Ring */}
            <div className="relative h-28 w-28 rounded-full border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/5">
              <div className="absolute inset-2 rounded-full border border-emerald-500/40 animate-ping opacity-40" />
              <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-emerald-400 animate-spin" />
              <Sparkles className="h-10 w-10 text-emerald-400" />
            </div>
            
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                Precision Scanning
              </h2>
              <p className="text-slate-400 text-sm max-w-xs">{scanStatus}</p>
            </div>

            <div className="w-32 bg-slate-900 h-1 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 animate-shimmer w-full" style={{ backgroundSize: '200% 100%' }} />
            </div>
          </div>
        </div>
      )}

      {/* Goal Configuration Sheet/Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div 
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-5 animate-slide-up"
            style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-850/40">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-extrabold">Configure Daily Targets</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateGoals} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Daily Calories (kcal)</label>
                <input 
                  type="number" 
                  value={formCalories}
                  onChange={(e) => setFormCalories(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-100 placeholder-slate-600 focus:outline-none transition w-full"
                  placeholder="e.g. 2000"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Carbs (g)</label>
                  <input 
                    type="number" 
                    value={formCarbs}
                    onChange={(e) => setFormCarbs(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-cyan-500 rounded-xl px-3 py-2.5 text-sm font-bold text-center text-slate-100 placeholder-slate-600 focus:outline-none transition"
                    placeholder="225"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Protein (g)</label>
                  <input 
                    type="number" 
                    value={formProtein}
                    onChange={(e) => setFormProtein(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-purple-500 rounded-xl px-3 py-2.5 text-sm font-bold text-center text-slate-100 placeholder-slate-600 focus:outline-none transition"
                    placeholder="130"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Fats (g)</label>
                  <input 
                    type="number" 
                    value={formFats}
                    onChange={(e) => setFormFats(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-amber-500 rounded-xl px-3 py-2.5 text-sm font-bold text-center text-slate-100 placeholder-slate-600 focus:outline-none transition"
                    placeholder="65"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl transition shadow-md shadow-emerald-950/20 active:scale-[0.99] flex items-center justify-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>Save Configuration</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
