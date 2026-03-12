import { FloatingHeader } from '@/components/ui/floating-header';

export function Header() {
  return (
    <div
      className="flex w-full justify-center pt-6 pb-4 pointer-events-none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 }}
    >
      <div className="w-full pointer-events-auto flex justify-center">
        <FloatingHeader />
      </div>
    </div>
  );
}
