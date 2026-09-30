import { BusinessRtsBoard } from '../rts/BusinessRtsBoard';

export function BusinessRtsConsole() {
  return (
    <div className="h-full min-h-0">
      <BusinessRtsBoard standalone={false} />
    </div>
  );
}
