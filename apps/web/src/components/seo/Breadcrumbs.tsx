import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs font-mono uppercase text-[#71717a] py-2">
      <Link href="/" className="hover:text-black transition-colors flex items-center gap-1">
        <Home className="w-3 h-3" />
        <span>Home</span>
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={item.url}>
            <ChevronRight className="w-3 h-3 text-[#999999]" />
            {isLast ? (
              <span className="text-black font-medium truncate max-w-[240px]" aria-current="page">
                {item.name}
              </span>
            ) : (
              <Link href={item.url} className="hover:text-black transition-colors truncate max-w-[200px]">
                {item.name}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
