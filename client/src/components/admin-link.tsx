import { Link } from 'wouter';
import { Settings } from 'lucide-react';

export default function AdminLink() {
  return (
    <Link href="/admin">
      <div className="fixed top-4 right-4 z-50">
        <button className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg border border-white/20 text-white transition-all">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </Link>
  );
}