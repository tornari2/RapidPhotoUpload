import type { Tag } from '../../types/tag';

interface TagDisplayProps {
  tags: Tag[];
  maxVisible?: number;
  onTagClick?: (tag: Tag) => void;
  className?: string;
}

/**
 * Component for displaying tags
 */
export function TagDisplay({ tags, maxVisible = 3, onTagClick, className = '' }: TagDisplayProps) {
  if (tags.length === 0) {
    return null;
  }

  const visibleTags = tags.slice(0, maxVisible);
  const remainingCount = tags.length - maxVisible;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {visibleTags.map((tag) => (
        <span
          key={tag.id}
          onClick={() => onTagClick?.(tag)}
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 ${
            onTagClick ? 'cursor-pointer hover:bg-blue-200' : ''
          }`}
        >
          {tag.name}
        </span>
      ))}
      {remainingCount > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
          +{remainingCount}
        </span>
      )}
    </div>
  );
}

