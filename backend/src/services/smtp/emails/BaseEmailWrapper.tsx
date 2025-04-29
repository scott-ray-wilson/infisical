import { Body, Container, Head, Hr, Html, Img, Link, Preview, Section, Tailwind, Text } from "@react-email/components";
import React, { ReactNode } from "react";

export interface BaseEmailWrapperProps {
  title: string;
  preview: string;
  siteUrl: string;
  children?: ReactNode;
}

export const BaseEmailWrapper = ({ title, preview, children, siteUrl }: BaseEmailWrapperProps) => {
  return (
    <Html>
      <Head title={title} />
      <Tailwind>
        <Body className="bg-gray-300 my-auto mx-auto font-sans px-[8px]">
          <Preview>{preview}</Preview>
          <Container className="bg-white rounded-xl my-[40px] mx-auto pb-[0px] max-w-[500px]">
            <Section className="border-0 bg-[#EBF852] mb-[44px] h-[14px] rounded-t-xl" />
            <Section className="px-[32px] mb-[18px]">
              <Section className="w-[48px] h-[48px] border border-solid border-gray-300 rounded-full bg-gray-100 mx-auto">
                <Img
                  src={`https://infisical.com/_next/image?url=%2Fimages%2Flogo-black.png&w=64&q=75`}
                  width="32"
                  alt="Infisical Logo"
                  className="mx-auto"
                />
              </Section>
            </Section>
            <Section className="px-[28px]">{children}</Section>
            <Hr className=" mt-[32px] mb-[0px] h-[1px]" />
            <Section className="px-[24px] text-center">
              <Text className="text-gray-500 text-[12px]">
                Email sent via Infisical at{" "}
                <Link href={siteUrl} className="text-slate-500 no-underline">
                  {siteUrl}
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
