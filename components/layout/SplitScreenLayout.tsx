'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
    leftPanel: React.ReactNode;
    rightPanel: React.ReactNode;
    defaultSplit?: number;
}

export default function SplitScreenLayout({ leftPanel, rightPanel, defaultSplit = 55 }: Props) {
    const [splitPosition, setSplitPosition] = useState(defaultSplit);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !containerRef.current) return;
        const container = containerRef.current.getBoundingClientRect();
        const newPosition = ((e.clientX - container.left) / container.width) * 100;
        setSplitPosition(Math.max(30, Math.min(70, newPosition)));
    };

    return (
        <div
            ref={containerRef}
            className="flex h-full overflow-hidden"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Left Panel */}
            <div className="overflow-y-auto bg-white" style={{ width: `${splitPosition}%` }}>
                {leftPanel}
            </div>

            {/* Divider */}
            <div
                className={`
          w-1 flex-shrink-0 cursor-col-resize transition-colors relative group
          ${isDragging ? 'bg-neutral-400' : 'bg-neutral-200 hover:bg-neutral-300'}
        `}
                onMouseDown={handleMouseDown}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-1 h-8 flex flex-col gap-1 items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-neutral-400"></div>
                        <div className="w-1 h-1 rounded-full bg-neutral-400"></div>
                        <div className="w-1 h-1 rounded-full bg-neutral-400"></div>
                    </div>
                </div>
            </div>

            {/* Right Panel */}
            <div className="overflow-y-auto bg-neutral-50" style={{ width: `${100 - splitPosition}%` }}>
                {rightPanel}
            </div>
        </div>
    );
}
