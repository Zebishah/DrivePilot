import { Loader2 } from "lucide-react";

export const LoadingCard: React.FC = () => (
  <div className="bg-gray-200 rounded-lg p-6 h-32 flex items-center justify-center animate-pulse">
    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
  </div>
);
