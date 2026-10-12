import { UserButton } from "#components/auth/user/user-button.tsx";
import { Logo } from "#components/Logo/Logo.tsx";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="tw:h-screen tw:w-screen tw:flex tw:flex-col tw:overflow-hidden tw:gap-1 tw:px-5 tw:py-2">
      <header className="tw:flex tw:gap-2 tw:items-center">
        <h1 className="text-center tw:grow">
          <Logo />
        </h1>
        <UserButton className="rounded" />
      </header>
      {children}
    </div>
  );
};
