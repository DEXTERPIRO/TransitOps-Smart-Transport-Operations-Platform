import { X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const { theme } = useAuthStore();
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  const screwBg = isDark
    ? 'radial-gradient(circle at 12px 12px, rgba(0,0,0,0.5) 1.5px, transparent 2px), radial-gradient(circle at calc(100% - 12px) 12px, rgba(0,0,0,0.5) 1.5px, transparent 2px)'
    : 'radial-gradient(circle at 12px 12px, rgba(0,0,0,0.15) 1.5px, transparent 2px), radial-gradient(circle at calc(100% - 12px) 12px, rgba(0,0,0,0.15) 1.5px, transparent 2px)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Recessed backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
           onClick={onClose} />
      
      {/* Tactile Panel */}
      <div 
        style={{ backgroundImage: screwBg }}
        className={`relative w-full ${sizes[size]} rounded-2xl border border-[var(--border-color)] shadow-[var(--shadow-floating)] max-h-[90vh] overflow-y-auto bg-[var(--background)] text-[var(--text-primary)] transition-all pt-4`}>
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pb-4 border-b border-[var(--border-color)]">
          <h3 className="font-bold text-sm uppercase font-mono tracking-wider text-[var(--text-primary)]">
            {title}
          </h3>
          <button onClick={onClose}
            className="p-1.5 rounded-lg bg-[var(--background)] shadow-[var(--shadow-card)] active:shadow-[var(--shadow-pressed)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
