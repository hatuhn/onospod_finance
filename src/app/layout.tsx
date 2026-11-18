import type {ReactNode} from 'react';
import '@fontsource-variable/inter';
import './style.css';

export const metadata = {title: 'Onospod Finance', description: 'Onospod Finance · Sample data'};
export default function Layout({children}: {children: ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
