import { useMemo } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { Professional, ProfessionalCategory, ActionType } from '@/types';

interface CategoryCalculationResult {
  categoryId: string;
  daysRemaining: number;
  isExpired: boolean;
}

/**
 * Calculates the correct category for a professional based on their last action type
 * and the days defined in each category hierarchy.
 * 
 * The category is determined by matching the action type's classification to the category's condition.
 * If the professional has an action of type "relacionamento", they go to the category with condition "relacionamento".
 * The countdown starts from that category's days, and when expired, falls to lower categories.
 */
export function calculateProfessionalCategory(
  professional: Professional,
  categories: ProfessionalCategory[],
  actionTypes: ActionType[]
): CategoryCalculationResult {
  // Sort categories by hierarchy (order) - lower number = higher rank
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
  
  if (sortedCategories.length === 0) {
    return { categoryId: professional.categoryId, daysRemaining: 0, isExpired: true };
  }

  const lowestCategory = sortedCategories[sortedCategories.length - 1];

  // If no last action date, assign to lowest category
  if (!professional.lastActionDate) {
    return { 
      categoryId: lowestCategory.id, 
      daysRemaining: 0, 
      isExpired: true 
    };
  }

  const lastActionDate = parseISO(professional.lastActionDate);
  const daysSinceAction = differenceInDays(new Date(), lastActionDate);

  // Find the action type to get its classification
  const lastActionType = actionTypes.find(at => at.id === professional.lastActionTypeId);
  
  // If no action type found, fall back to lowest category
  if (!lastActionType) {
    return { 
      categoryId: lowestCategory.id, 
      daysRemaining: 0, 
      isExpired: true 
    };
  }

  // Find the category that matches the action type's classification
  const matchingCategoryIndex = sortedCategories.findIndex(
    cat => cat.condition === lastActionType.classification
  );

  // If no matching category, assign to lowest
  if (matchingCategoryIndex === -1) {
    return { 
      categoryId: lowestCategory.id, 
      daysRemaining: 0, 
      isExpired: true 
    };
  }

  // Start counting from the matching category
  // Check if the days for that category have expired
  const matchingCategory = sortedCategories[matchingCategoryIndex];
  
  if (daysSinceAction < matchingCategory.daysToChange) {
    // Still within the matching category's days
    return {
      categoryId: matchingCategory.id,
      daysRemaining: matchingCategory.daysToChange - daysSinceAction,
      isExpired: false,
    };
  }

  // Days have expired for the matching category
  // Fall through to lower categories based on accumulated days
  let accumulatedDays = matchingCategory.daysToChange;
  
  for (let i = matchingCategoryIndex + 1; i < sortedCategories.length; i++) {
    const category = sortedCategories[i];
    accumulatedDays += category.daysToChange;
    
    if (daysSinceAction < accumulatedDays) {
      // Professional should be in this category
      const daysRemaining = accumulatedDays - daysSinceAction;
      return {
        categoryId: category.id,
        daysRemaining,
        isExpired: false,
      };
    }
  }

  // If all category days have expired, assign to lowest category
  return {
    categoryId: lowestCategory.id,
    daysRemaining: 0,
    isExpired: true,
  };
}

/**
 * Determines which category a professional should be promoted to based on action type
 */
export function getCategoryForAction(
  actionType: ActionType,
  categories: ProfessionalCategory[]
): ProfessionalCategory | null {
  // Sort categories by hierarchy (order) - lower number = higher rank
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
  
  if (sortedCategories.length === 0) return null;

  // Find a category that matches the action classification
  const matchingCategory = sortedCategories.find(
    cat => cat.condition === actionType.classification
  );

  // If no matching category, return the highest one (most privileged)
  return matchingCategory || sortedCategories[0];
}

/**
 * Hook that returns professionals with their calculated categories
 */
export function useProfessionalsWithCalculatedCategories(
  professionals: Professional[],
  categories: ProfessionalCategory[],
  actionTypes: ActionType[]
) {
  return useMemo(() => {
    return professionals.map(professional => {
      const calculation = calculateProfessionalCategory(professional, categories, actionTypes);
      return {
        ...professional,
        calculatedCategoryId: calculation.categoryId,
        daysRemaining: calculation.daysRemaining,
        isExpired: calculation.isExpired,
        needsCategoryUpdate: professional.categoryId !== calculation.categoryId,
      };
    });
  }, [professionals, categories, actionTypes]);
}
