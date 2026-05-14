import React from 'react';

const SizedContainer = ({ heightClass = "h-64", children }) => {
  const ref = React.useRef(null);
  const [size, setSize] = React.useState({ w: 0, h: 0 });

  React.useLayoutEffect(() => {
    if (!ref.current) return;
    const measure = () => {
      const rect = ref.current.getBoundingClientRect();
      setSize({ 
        w: Math.max(0, Math.floor(rect.width)), 
        h: Math.max(0, Math.floor(rect.height)) 
      });
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const ready = size.w > 0 && size.h > 0;
  const childWithKey = React.isValidElement(children)
    ? React.cloneElement(children, { key: `${size.w}x${size.h}` })
    : children;

  return (
    <div ref={ref} className={`${heightClass} w-full`}>
      {ready ? childWithKey : <div className="h-full w-full bg-gray-100 rounded animate-pulse" />}
    </div>
  );
};

export default SizedContainer;
