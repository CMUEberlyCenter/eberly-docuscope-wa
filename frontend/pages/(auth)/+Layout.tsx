// import { TooltipProvider } from "@/components/ui/tooltip"

export const Layout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="tw:flex tw:h-screen tw:w-screen tw:items-center tw:justify-center">
      {children}
    </div>
  );
}
