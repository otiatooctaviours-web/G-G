import { LockKeyhole } from 'lucide-react';

export function BrowserFrame({ src, alt, label, eager = false, className = '' }: { src: string; alt: string; label: string; eager?: boolean; className?: string }) {
  return <figure className={`browser-frame ${className}`}>
    <div className="browser-bar"><span className="browser-dots" aria-hidden="true"><i/><i/><i/></span><span className="browser-label"><LockKeyhole size={11}/>{label}</span><span className="browser-bar-end"/></div>
    <img src={src} alt={alt} width={1240} height={768} loading={eager ? 'eager' : 'lazy'} decoding="async"/>
  </figure>;
}
