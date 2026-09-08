import { useCallback } from 'react';
import { useAssessmentBuilder } from './AssessmentBuilderContext';

/**
 * The two writes every question editor makes: merge `updates` into one item,
 * or into the section that holds it. Each editor used to declare both inline.
 *
 * Its own module (not AssessmentBuilderContext.jsx) so that file keeps
 * exporting only the provider, which Fast Refresh requires.
 */
export function useSectionItemEditor(sectionId, questionId) {
  const { dispatch, ACTIONS } = useAssessmentBuilder();

  const updateItem = useCallback((updates) => {
    dispatch({ type: ACTIONS.UPDATE_QUESTION, payload: { sectionId, questionId, updates } });
  }, [dispatch, ACTIONS, sectionId, questionId]);

  const updateSection = useCallback((updates) => {
    dispatch({ type: ACTIONS.UPDATE_SECTION, payload: { sectionId, updates } });
  }, [dispatch, ACTIONS, sectionId]);

  return { updateItem, updateSection };
}
