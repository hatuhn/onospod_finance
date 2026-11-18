import type {ComponentProps} from 'react';
import {cva, type VariantProps} from 'class-variance-authority';
import {cn} from '../../lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-full h-6 px-2.5 text-micro font-medium whitespace-nowrap', {
  variants: {
    variant: {
      neutral: 'bg-fill text-foreground',
      super: 'bg-vip-super-bg text-vip-super',
      partner: 'bg-vip-partner-bg text-vip-partner',
      seller: 'bg-vip-seller-bg text-vip-seller',
      green: 'bg-success/10 text-success',
      amber: 'bg-warning/10 text-warning',
      red: 'bg-destructive/10 text-destructive',
    },
  },
  defaultVariants: {variant: 'neutral'},
});

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export function Badge({className, variant, ...props}: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({variant}), className)} {...props}/>;
}
