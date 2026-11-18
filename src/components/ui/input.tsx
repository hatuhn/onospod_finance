import type {ComponentProps} from 'react';
import {cva, type VariantProps} from 'class-variance-authority';
import {cn} from '../../lib/utils';

export const fieldStyles = 'w-full min-w-0 max-w-full border border-input bg-card text-foreground placeholder:text-tertiary transition-[border-color,box-shadow] duration-150 hover:border-tertiary focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-tertiary aria-invalid:border-destructive aria-invalid:bg-destructive-tint aria-invalid:focus-visible:ring-destructive';
export const inputVariants = cva(fieldStyles, {
  variants: {
    size: {
      sm: 'h-9 rounded-md px-3 py-1 text-callout',
      default: 'h-9 rounded-md px-3 py-1 text-callout',
      lg: 'h-11 rounded-md px-3 text-body-lg',
    },
  },
  defaultVariants: {size: 'default'},
});

export function Input({className, type, size, ...props}: Omit<ComponentProps<'input'>, 'size'> & VariantProps<typeof inputVariants>) {
  return <input type={type} data-slot="input" className={cn(inputVariants({size}), 'read-only:bg-muted read-only:focus-visible:ring-0', className)} {...props}/>;
}
