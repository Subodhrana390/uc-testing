import { Loader2 } from "lucide-react";

export default function GeneralLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-500 space-y-4">
      <Loader2 className="w-10 h-10 animate-spin" />
      <p className="text-sm font-medium animate-pulse">Loading...</p>
    </div>
  );
}
