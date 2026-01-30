'use client';

interface Props {
    className?: string;
}

export function Spinner({ className = '' }: Props) {
    return (
        <div
            className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
            role="status"
            aria-label="Loading"
        >
            <span className="sr-only">Loading...</span>
        </div>
    );
}
