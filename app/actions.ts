"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./lib/prisma";
import { revalidatePath } from "next/cache";

export interface Meal {
  id: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  timestamp: string;
}

export interface UserGoals {
  targetCalories: number;
  targetCarbs: number;
  targetProtein: number;
  targetFats: number;
}

// 1. Get or initialize User Profile goals
export async function getUserGoals(): Promise<UserGoals> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  let profile = await prisma.userProfile.findUnique({
    where: { id: userId },
  });

  if (!profile) {
    const user = await currentUser();
    const email = user?.emailAddresses[0]?.emailAddress || "no-email@clerk.user";

    profile = await prisma.userProfile.create({
      data: {
        id: userId,
        email,
        targetCalories: 2000,
        targetCarbs: 225,
        targetProtein: 130,
        targetFats: 65,
      },
    });
  }

  return {
    targetCalories: profile.targetCalories,
    targetCarbs: profile.targetCarbs,
    targetProtein: profile.targetProtein,
    targetFats: profile.targetFats,
  };
}

// 2. Update User Profile goals
export async function updateUserGoals(
  calories: number,
  carbs: number,
  protein: number,
  fats: number
): Promise<UserGoals> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const updatedProfile = await prisma.userProfile.update({
    where: { id: userId },
    data: {
      targetCalories: calories,
      targetCarbs: carbs,
      targetProtein: protein,
      targetFats: fats,
    },
  });

  revalidatePath("/");
  return {
    targetCalories: updatedProfile.targetCalories,
    targetCarbs: updatedProfile.targetCarbs,
    targetProtein: updatedProfile.targetProtein,
    targetFats: updatedProfile.targetFats,
  };
}

// 3. Get Daily Log for a specific date
export async function getDailyLog(dateString: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Ensure profile exists
  await getUserGoals();

  const log = await prisma.dailyLog.findUnique({
    where: {
      userId_date: {
        userId,
        date: dateString,
      },
    },
  });

  if (!log) {
    return {
      meals: [] as Meal[],
      totalCalories: 0,
      totalCarbs: 0,
      totalProtein: 0,
      totalFats: 0,
    };
  }

  const meals = (log.meals as any[]) || [];
  
  const totals = meals.reduce(
    (acc, meal) => {
      acc.calories += meal.calories || 0;
      acc.carbs += meal.carbs || 0;
      acc.protein += meal.protein || 0;
      acc.fats += meal.fats || 0;
      return acc;
    },
    { calories: 0, carbs: 0, protein: 0, fats: 0 }
  );

  return {
    meals: meals as Meal[],
    totalCalories: totals.calories,
    totalCarbs: totals.carbs,
    totalProtein: totals.protein,
    totalFats: totals.fats,
  };
}

// 4. Add a meal to the Daily Log
export async function addMealToLog(
  dateString: string,
  mealData: Omit<Meal, "id" | "timestamp">
) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const newMeal: Meal = {
    ...mealData,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
  };

  const existingLog = await prisma.dailyLog.findUnique({
    where: {
      userId_date: {
        userId,
        date: dateString,
      },
    },
  });

  const mealsList = existingLog ? ((existingLog.meals as any[]) || []) : [];
  mealsList.push(newMeal);

  await prisma.dailyLog.upsert({
    where: {
      userId_date: {
        userId,
        date: dateString,
      },
    },
    update: {
      meals: mealsList,
    },
    create: {
      userId,
      date: dateString,
      meals: mealsList,
    },
  });

  revalidatePath("/");
  return newMeal;
}

// 5. Delete a meal from the Daily Log
export async function deleteMealFromLog(dateString: string, mealId: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const existingLog = await prisma.dailyLog.findUnique({
    where: {
      userId_date: {
        userId,
        date: dateString,
      },
    },
  });

  if (!existingLog) return;

  const mealsList = (existingLog.meals as any[]) || [];
  const updatedMeals = mealsList.filter((m) => m.id !== mealId);

  await prisma.dailyLog.update({
    where: {
      userId_date: {
        userId,
        date: dateString,
      },
    },
    data: {
      meals: updatedMeals,
    },
  });

  revalidatePath("/");
}
