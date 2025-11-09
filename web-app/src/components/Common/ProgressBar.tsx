interface ProgressBarProps {
  progress?: number; // 0-100, if undefined shows indeterminate progress
  className?: string;
  showLabel?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'white';
}

/**
 * Progress bar component that shows either determinate or indeterminate progress
 */
export function ProgressBar({ 
  progress, 
  className = '', 
  showLabel = false,
  label,
  size = 'md',
  color = 'blue'
}: ProgressBarProps) {
  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    white: 'bg-white'
  };

  const isIndeterminate = progress === undefined;
  const displayProgress = Math.min(100, Math.max(0, progress || 0));

  return (
    <>
      <style>{`
        @keyframes progress-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .progress-shimmer {
          animation: progress-shimmer 1.5s ease-in-out infinite;
        }
      `}</style>
      <div className={`w-full ${className}`}>
        {showLabel && label && (
          <div className="mb-1 text-xs text-gray-400">{label}</div>
        )}
        <div className={`w-full bg-gray-700 rounded-full overflow-hidden ${heightClasses[size]}`}>
          {isIndeterminate ? (
            <div className={`h-full ${colorClasses[color]} rounded-full relative`}>
              <div 
                className="h-full w-1/3 absolute bg-gradient-to-r from-transparent via-white/40 to-transparent progress-shimmer"
              />
            </div>
          ) : (
            <div 
              className={`h-full ${colorClasses[color]} rounded-full transition-all duration-300 ease-out`}
              style={{ width: `${displayProgress}%` }}
            />
          )}
        </div>
        {showLabel && !isIndeterminate && (
          <div className="mt-1 text-xs text-gray-400 text-right">{displayProgress.toFixed(0)}%</div>
        )}
      </div>
    </>
  );
}
