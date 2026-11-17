import { useEffect, useRef, useState } from 'react';

import {
    getLearningProgress,
    setLearningBookmark,
    completeLearningCard
} from '../services/learningApi';

export const LEARNING_STAGES = [
    'Beginner',
    'Developing',
    'Confident'
];

const initial = {
    savedIds: [],
    completedIds: [],
    completedStages: {}
};

export default function useDemoLearning() {
    const [learning, setLearning] = useState(initial);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const busyRef = useRef(false);

    // Retrieve the user's learning progress from Supabase
    useEffect(() => {
        let active = true;

        async function loadLearning() {
            setLoading(true);
            setError(null);

            try {
                const data = await getLearningProgress();

                if (active) {
                    setLearning(data);
                }
            } catch (err) {
                if (active) {
                    setError(err.message);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadLearning();

        return () => {
            active = false;
        };
    }, [retryCount]);

    // Save or remove a bookmark
    async function toggleSaved(topicId) {
        if (loading || error || busyRef.current) {
            return false;
        }

        busyRef.current = true;
        setIsUpdating(true);
        setActionError(null);

        const shouldSave = !learning.savedIds.includes(topicId);

        try {
            await setLearningBookmark(topicId, shouldSave);

            setLearning(previous => ({
                ...previous,
                savedIds: shouldSave
                    ? [...new Set([...previous.savedIds, topicId])]
                    : previous.savedIds.filter(id => id !== topicId)
            }));

            return true;

        } catch (err) {
            setActionError(err.message);
            return false;

        } finally {
            busyRef.current = false;
            setIsUpdating(false);
        }
    }

    // Complete an individual learning card
    async function markStageCompleted(topicId, stage) {
        if (
            loading ||
            error ||
            busyRef.current ||
            !LEARNING_STAGES.includes(stage)
        ) {
            return false;
        }

        busyRef.current = true;
        setIsUpdating(true);
        setActionError(null);

        try {
            await completeLearningCard(topicId, stage);

            setLearning(previous => {
                const previousStages =
                    previous.completedStages[topicId] || [];

                const nextStages = LEARNING_STAGES.filter(
                    item =>
                        item === stage ||
                        previousStages.includes(item)
                );

                const completedStages = {
                    ...previous.completedStages,
                    [topicId]: nextStages
                };

                const allDone = LEARNING_STAGES.every(
                    item => nextStages.includes(item)
                );

                return {
                    ...previous,
                    completedStages,
                    completedIds: allDone
                        ? [...new Set([
                            ...previous.completedIds,
                            topicId
                        ])]
                        : previous.completedIds.filter(
                            id => id !== topicId
                        )
                };
            });

            return true;

        } catch (err) {
            setActionError(err.message);
            return false;

        } finally {
            busyRef.current = false;
            setIsUpdating(false);
        }
    }

    function retry() {
        setRetryCount(previous => previous + 1);
    }

    return {
        learning,
        loading,
        error,
        actionError,
        isUpdating,
        toggleSaved,
        markStageCompleted,
        retry
    };
}