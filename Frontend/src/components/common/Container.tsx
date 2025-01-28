import React, { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
}

const Container: React.FC<ContainerProps> = ({ children }) => {
  return (
    // <div className="mx-5  md:mx-10 lg:mx-20 xl:mx-28 2xl:mx-28   h-full   max-w-[1440px]">
    <div className="mx-auto px-10 md:px-16 lg:px-20 xl:px-20  h-full max-w-[1440px]">
      {children}
    </div>
  );
};

export default Container;
