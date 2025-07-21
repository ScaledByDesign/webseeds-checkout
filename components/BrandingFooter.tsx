import { FunctionComponent } from "react";
import Image from "next/image";

export type BrandingFooterType = {
  className?: string;
};

const BrandingFooter: FunctionComponent<BrandingFooterType> = ({
  className = "",
}) => {
  return (
    <header
      className={`self-stretch flex flex-row items-end justify-center pt-[64.6px] pb-[65.7px] pl-14 pr-5 box-border gap-[288.9px] max-w-full mt-[-4670px] relative text-left text-[91px] text-dimgray-300 font-roboto mq450:gap-9 mq925:gap-[72px] mq1350:gap-36 mq1350:pl-7 mq1350:box-border mq1800:flex-wrap ${className}`}
    >
      <div className="w-[164.8px] flex flex-col items-start justify-end pt-0 px-0 pb-[16.8px] box-border font-inter">
        <div className="w-[118.1px] h-[71px] relative">
          <div className="absolute top-[5px] left-[0px] w-full h-[66px] flex flex-row items-start justify-start">
            <h1 className="m-0 self-stretch flex-1 relative text-[length:inherit] font-normal font-[inherit] z-[12] mq450:text-[27px] mq925:text-[45px]">
              Fit
            </h1>
            <div className="h-[87px] w-[328px] absolute !!m-[0 important] right-[-326.4px] bottom-[-20px]">
              <div className="absolute h-full top-[0px] bottom-[0px] left-[0px] w-[303px]">
                <Image
                  className="absolute top-[-81.5px] right-[-1607.5px] w-[2285px] h-[231px] z-[8]"
                  alt=""
                  src="/rectangle-648.svg"
                  width={2285}
                  height={231}
                />
                <div
                  className="absolute top-[0px] left-[0px] w-full h-full z-[9]"
                />
                <Image
                  className="absolute top-[0px] left-[0px] w-full h-full object-cover z-[10]"
                  alt=""
                  src="/spresso-1@2x.png"
                  fill
                  sizes="303px"
                />
                <Image
                  className="absolute top-[0px] left-[0px] w-full h-full object-cover"
                  alt=""
                  src="/spresso-2@2x.png"
                  fill
                  sizes="303px"
                />
              </div>
              <Image
                className="absolute top-[25px] left-[302px] w-[26px] h-[26px] object-cover z-[12]"
                alt=""
                src="/@2x.png"
                width={26}
                height={26}
              />
            </div>
          </div>
          <div className="absolute top-[0px] left-[64.5px] w-[17.1px] h-[25px]">
            <div className="absolute top-[0px] left-[2px] w-[15.1px] h-[14.1px]">
              <div
                className="absolute top-[0px] left-[0px] w-full h-full z-[13]"
              />
              <Image
                className="absolute top-[0px] left-[0px] w-3.5 h-3.5 object-cover z-[14]"
                alt=""
                src="/layer-1-1@2x.png"
                width={14}
                height={14}
              />
              <Image
                className="absolute top-[0px] left-[0px] w-3.5 h-3.5 object-cover"
                alt=""
                src="/layer-1-2@2x.png"
                width={14}
                height={14}
              />
            </div>
            <Image
              className="absolute top-[14px] left-[0px] w-[13px] h-[11px] object-cover z-[16]"
              alt=""
              src="/layer-4@2x.png"
              width={13}
              height={11}
            />
          </div>
        </div>
      </div>
      <div className="w-[319.8px] flex flex-col items-start justify-end pt-0 px-0 pb-[6.8px] box-border text-4xl text-darkslategray-200">
        <div className="self-stretch flex flex-row items-start justify-start gap-[11.2px]">
          <div className="h-[35px] flex-1 flex flex-col items-start justify-start pt-[9px] px-0 pb-0 box-border">
            <h2 className="m-0 relative text-[length:inherit] font-medium font-[inherit] z-[9] mq450:text-[22px] mq925:text-[29px]">
              Secure Checkout
            </h2>
          </div>
          <div className="h-[38px] w-7 relative">
            <Image
              className="absolute top-[0px] left-[0px] w-full h-full object-cover z-[9]"
              alt=""
              src="/vector-smart-object-29@2x.png"
              fill
              sizes="28px"
            />
            <Image
              className="absolute top-[0px] left-[0px] w-full h-full object-cover z-[10]"
              alt=""
              src="/vector-smart-object-30@2x.png"
              fill
              sizes="28px"
            />
          </div>
        </div>
      </div>
      <div className="w-[747.7px] flex flex-row items-start justify-start gap-[28.1px] max-w-full text-right text-[42px] text-rosybrown-100 mq925:flex-wrap">
        <div className="flex-1 flex flex-col items-start justify-start pt-[35.9px] px-0 pb-0 box-border min-w-[337px] max-w-full mq450:min-w-full">
          <h2 className="m-0 self-stretch relative text-[length:inherit] font-medium font-[inherit] z-[9] mq450:text-[25px] mq925:text-[34px]">
            Special Price Reserved For
          </h2>
        </div>
        <div className="h-[96.2px] w-[201.4px] relative text-left text-[73px] text-white">
          <Image
            className="absolute top-[0px] left-[0px] w-full h-full z-[9]"
            alt=""
            src="/box-20.svg"
            fill
            sizes="201px"
          />
          <h2 className="m-0 absolute top-[21.9px] left-[25.1px] text-[length:inherit] leading-[52px] font-bold font-[inherit] inline-block w-[154.3px] z-[10] mq450:text-[44px] mq450:leading-[31px] mq925:text-[58px] mq925:leading-[42px]">
            9:59
          </h2>
        </div>
      </div>
    </header>
  );
};

export default BrandingFooter;
