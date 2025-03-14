import React from 'react';

const Loader = () => {
  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
    </div>
  );
};

export default Loader; 