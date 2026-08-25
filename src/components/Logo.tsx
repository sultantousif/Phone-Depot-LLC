import React from 'react';

interface LogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  width = 187,
  height = 127,
}) => {
  return (
    <img
      src="/logo.png"
      alt="HG WORLD CLASS"
      referrerPolicy="no-referrer"
      width={typeof width === 'number' ? width : 187}
      height={typeof height === 'number' ? height : 127}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      className={`block object-contain rounded-md select-none transition-transform ${className}`}
    />
  );
};

export default Logo;
