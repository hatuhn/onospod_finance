import type {ComponentProps} from 'react';
import {cn} from '../../lib/utils';
import {fieldStyles} from './input';

export function Textarea({className, ...props}: ComponentProps<'textarea'>) {
  return <textarea data-slot="textarea" className={cn(fieldStyles, 'min-h-28 resize-y rounded-md px-3 py-2 text-callout read-only:bg-muted read-only:focus-visible:ring-0', className)} {...props}/>;
}
