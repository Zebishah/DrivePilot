declare module "react-rating-stars-component" {
  import * as React from "react";

  interface ReactStarsProps {
    count?: number;
    value?: number;
    onChange?: (newValue: number) => void;
    size?: number;
    isHalf?: boolean;
    edit?: boolean;
    activeColor?: string;
    color?: string;
    classNames?: string;
  }

  const ReactStars: React.FC<ReactStarsProps>;
  export default ReactStars;
}
