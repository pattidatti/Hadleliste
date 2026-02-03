/**
 * Haptic feedback service for providing physical tactile feedback on supported devices.
 */
export const haptics = {
    /**
     * Subtle impact (10ms) - for button presses and small adjustments.
     */
    impact: () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10);
        }
    },

    /**
     * Medium impact (20ms) - for toggles and specific status changes.
     */
    medium: () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(20);
        }
    },

    /**
     * Success pulse (double pulse) - for adding items or completing major tasks.
     */
    success: () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([10, 50, 10]);
        }
    },

    /**
     * Warning/Error impact (40ms) - for deletions, resets, or errors.
     */
    warning: () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(40);
        }
    }
};
