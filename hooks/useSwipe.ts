import { useRef, TouchEvent, useState } from 'react';

export const useSwipe = (onSwipeLeft: () => void, onSwipeRight?: () => void, threshold = 75) => {
    const startX = useRef<number | null>(null);
    const startY = useRef<number | null>(null);
    const [touchDelta, setTouchDelta] = useState(0);

    const onTouchStart = (e: TouchEvent) => {
        startX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
        if (!startX.current) return;
        const currentX = e.touches[0].clientX;
        const diff = startX.current - currentX;

        // Only track horizontal swipes
        if (Math.abs(diff) > 5) {
            setTouchDelta(diff);
        }
    };

    const onTouchEnd = (e: TouchEvent) => {
        if (!startX.current || !startY.current) return;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;

        const diffX = startX.current - endX;
        const diffY = startY.current - endY;

        // Ensure it's more horizontal than vertical
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > threshold) {
                onSwipeLeft();
            } else if (diffX < -threshold && onSwipeRight) {
                onSwipeRight();
            }
        }

        startX.current = null;
        startY.current = null;
        setTouchDelta(0);
    };

    return { onTouchStart, onTouchMove, onTouchEnd, touchDelta };
};
