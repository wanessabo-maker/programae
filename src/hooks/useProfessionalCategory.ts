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
  professional: Professional & { isManualCategory?: boolean },
  categories: ProfessionalCategory[],
  actionTypes: ActionType[]
): CategoryCalculationResult & { isManualCategory?: boolean } {
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

  // If category was manually set, respect that setting
  // Use the current category and calculate days remaining based on it
  if (professional.isManualCategory) {
    const manualCategory = sortedCategories.find(c => c.id === professional.categoryId);
    
    if (manualCategory) {
      const daysRemaining = Math.max(0, manualCategory.daysToChange - daysSinceAction);
      const isExpired = daysSinceAction >= manualCategory.daysToChange;
      
      // If manual category has expired, we allow automatic recategorization
      if (isExpired) {
        // Continue with normal calculation below (manual flag will be cleared on next action)
      } else {
        return {
          categoryId: manualCategory.id,
          daysRemaining,
          isExpired: false,
          isManualCategory: true,
        };
      }
    }
  }

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
 * Determines if a new action should update the professional's category tracking.
 * A higher-rank category should NOT be overwritten by a lower-rank action
 * while still within the protection period.
 * 
 * Returns true if the professional's lastActionTypeId and lastActionDate should be updated.
 */
export function shouldUpdateProfessionalCategory(
  professional: { lastActionDate?: string; lastActionTypeId?: string },
  newActionType: ActionType,
  categories: ProfessionalCategory[],
  actionTypes: ActionType[],
  newActionDate: string
): boolean {
  // Sort categories by hierarchy (order) - lower number = higher rank
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
  
  if (sortedCategories.length === 0) return true;

  // If no previous action, always update
  if (!professional.lastActionDate || !professional.lastActionTypeId) {
    return true;
  }

  // Find the current action type
  const currentActionType = actionTypes.find(at => at.id === professional.lastActionTypeId);
  if (!currentActionType) {
    return true;
  }

  // Find categories for current and new action types
  const currentCategory = sortedCategories.find(
    cat => cat.condition === currentActionType.classification
  );
  const newCategory = sortedCategories.find(
    cat => cat.condition === newActionType.classification
  );

  // If either category is not found, allow update
  if (!currentCategory || !newCategory) {
    return true;
  }

  // If new action has equal or higher rank (lower order number), always update
  if (newCategory.order <= currentCategory.order) {
    return true;
  }

  // New action has LOWER rank - check if current category protection period has expired
  const lastActionDate = parseISO(professional.lastActionDate);
  const daysSinceAction = differenceInDays(new Date(), lastActionDate);

  // If still within the protection period of current (higher) category, DO NOT update
  if (daysSinceAction < currentCategory.daysToChange) {
    return false;
  }

  // Protection period has expired, allow update
  return true;
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
