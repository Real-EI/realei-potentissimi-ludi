'use client';

import { motion, useReducedMotion } from 'motion/react';

/**
 * Fade-in (with a small upward slide) for pages and screens.
 * Re-mount it with a different `key` to replay the animation when the screen changes.
 * Users who prefer reduced motion get a plain, short fade.
 */
const FadeComponent = ({ children, className = '', duration = 0.45 }) => {
    const reduce = useReducedMotion();

    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0.15 : duration, ease: [0.22, 1, 0.36, 1] }}
        >
            {children}
        </motion.div>
    );
};

export default FadeComponent;
