import { BounceLoader } from "react-spinners";
const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center h-screen">
      <BounceLoader color="#36d7b7" />
    </div>
  );
};

export default LoadingSpinner;
