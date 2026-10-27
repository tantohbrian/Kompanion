import React from 'react';
import * as RadixSlider from '@radix-ui/react-slider';
import { cn } from './utils';

export interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className,
  'aria-label': ariaLabel = 'Slider',
}) => {
  return (
    <RadixSlider.Root
      value={value}
      onValueChange={onValueChange}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'relative flex items-center select-none touch-none w-full h-5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      <RadixSlider.Track className="bg-surface-elevated border border-border relative grow rounded-full h-1">
        <RadixSlider.Range className="absolute bg-accent rounded-full h-full" />
      </RadixSlider.Track>
      <RadixSlider.Thumb
        className="block w-3.5 h-3.5 bg-text-primary border border-border-strong rounded-full shadow-sm hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-transform"
        aria-label={ariaLabel}
      />
    </RadixSlider.Root>
  );
};
