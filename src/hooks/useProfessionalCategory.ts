import { useMemo } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { Professional, ProfessionalCategory, ActionType } from '@/types';

interface CategoryCalculationResult {
  categoryId: string;
  daysRemaining: number;
  isExpired: boolean;
}

/**
 * Calculates the correct category for a professional based on their last action date
 * and the days defined in each category hierarchy.
 * 
 * Category #1 (highest hierarchy) remains until its days expire, then falls to #2, #3, etc.
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

  // If no last action date, assign to lowest category
  if (!professional.lastActionDate) {
    const lowestCategory = sortedCategories[sortedCategories.length - 1];
    return { 
      categoryId: lowestCategory.id, 
      daysRemaining: 0, 
      isExpired: true 
    };
  }

  const lastActionDate = parseISO(professional.lastActionDate);
  const daysSinceAction = differenceInDays(new Date(), lastActionDate);

  // Find the appropriate category based on days elapsed
  // Start from highest category and check if days have expired
  let accumulatedDays = 0;
  
  for (let i = 0; i < sortedCategories.length; i++) {
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
  const lowestCategory = sortedCategories[sortedCategories.length - 1];
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
