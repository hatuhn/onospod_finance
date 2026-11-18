import type {ComponentProps} from 'react';
import {cva, type VariantProps} from 'class-variance-authority';
import {cn} from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md border border-transparent font-medium whitespace-nowrap transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:border-border disabled:bg-muted disabled:text-tertiary [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed',
        outline: 'border-input bg-card text-foreground hover:bg-accent',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        default: 'h-9 px-4 text-callout',
        sm: 'h-9 px-3 text-callout',
        icon: 'size-9',
      },
    },
    defaultVariants: {variant: 'outline', size: 'default'},
  },
);

export function Button({className, variant, size, type = 'button', ...props}: ComponentProps<'button'> & VariantProps<typeof buttonVariants>) {
  return <button type={type} data-slot="button" className={cn(buttonVariants({variant, size}), className)} {...props}/>;
}
