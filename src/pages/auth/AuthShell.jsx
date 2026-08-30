import loginBg from '../../assets/images/login_bg.svg';
import truDevLogo from '../../assets/icons/trudev_logo.svg';

/**
 * Shared chrome for the standalone auth pages.
 *
 * Extracted so the recovery pages (accept invite, forgot/reset password) match
 * login and signup without a fourth copy of the same 60-line layout.
 */
export default function AuthShell({ title, subtitle, error, success, children, footer }) {
  return (
    <div
      className="h-[100dvh] w-full flex overflow-hidden bg-white p-0 md:p-4 lg:p-3 xl:p-4"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div
        className="hidden md:block md:w-[42%] lg:w-[40%] xl:w-[44%] shrink-0 rounded-2xl bg-cover bg-center"
        style={{ backgroundImage: `url(${loginBg})` }}
      />

      <div className="flex-1 min-h-0 flex items-center justify-center overflow-y-auto px-6 py-[clamp(12px,3vh,64px)] sm:px-10 xl:px-16">
        <div className="w-full max-w-[371px] flex flex-col items-center">
          <div className="flex items-center mb-20">
            <img src={truDevLogo} alt="" className="h-6 w-6" />
            <span className="font-wordmark text-[clamp(16px,2.6vh,22px)] font-medium leading-6 text-[#121212]">
              TruDev
            </span>
          </div>

          <div className="flex flex-col items-center gap-[clamp(4px,1vh,12px)] text-center mb-[clamp(12px,4vh,40px)] w-full">
            <h1
              className="text-[clamp(24px,6vh,48px)] leading-[1.05] tracking-[-0.05em] xl:tracking-[-0.07em] text-[#121212] font-medium"
              style={{ fontFamily: "'Noto Serif Display', serif" }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-[clamp(12px,1.8vh,16px)] leading-6 text-[#3d3d3d]">{subtitle}</p>
            )}
          </div>

          {error && (
            <div className="w-full mb-4 rounded-lg border border-error-border bg-error-bg px-3 py-2 text-[13px] leading-relaxed text-error">
              {error}
            </div>
          )}
          {success && (
            <div className="w-full mb-4 rounded-lg border border-success-border bg-success-bg px-3 py-2 text-[13px] leading-relaxed text-success">
              {success}
            </div>
          )}

          {children}

          {footer && <div className="mt-6 text-[13px] text-[#3d3d3d]">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export const fieldClass =
  'w-full rounded-lg border border-[#e4e4e7] px-3 py-2.5 text-[14px] text-[#121212] ' +
  'outline-none focus:border-[#121212] transition-colors';

export const buttonClass =
  'w-full rounded-lg bg-[#121212] px-3 py-2.5 text-[14px] font-medium text-white ' +
  'transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed';
