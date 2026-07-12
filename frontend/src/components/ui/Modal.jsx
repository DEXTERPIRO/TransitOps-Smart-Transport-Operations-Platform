import { X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const { theme } = useAuthStore();
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"
           onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} rounded-2xl border
                       shadow-2xl max-h-[90vh] overflow-y-auto
        ${isDark
          ? 'bg-slate-900 border-slate-700'
          : 'bg-white border-slate-200'}`}>
        <div className={`flex items-center justify-between p-5 border-b
          ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <h3 className="font-semibold text-base">{title}</h3>
          <button onClick={onClose}
            className={`p-1.5 rounded-lg transition
              ${isDark
                ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                : 'text-slate-500 hover:bg-slate-100'}`}>
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
