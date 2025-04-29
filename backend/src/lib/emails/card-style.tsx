import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text
} from "@react-email/components";
import React from "react";

interface PlaidVerifyIdentityEmailProps {
  orgName: string;
  invitingUserName: string;
  invitingUserEmail: string;
  callbackUrl: string;
  token: string;
  metadata?: string;
  inviteeEmail: string;
  orgId: string;
}

export const PlaidVerifyIdentityEmail = ({
  orgName,
  invitingUserName,
  invitingUserEmail,
  token,
  callbackUrl,
  metadata,
  inviteeEmail,
  orgId
}: PlaidVerifyIdentityEmailProps) => {
  return (
    <Html>
      <Head title="Organization Invitation" />
      <Tailwind>
        <Body className="bg-gray-300 my-auto mx-auto font-sans px-2">
          <Preview>Test Email</Preview>
          <Container className="bg-white rounded-2xl my-[40px] mx-auto pb-[0px] max-w-[465px]">
            <Section className="border-0 bg-[#c2d62b] mt-[0px] mb-[38px] h-[18px] rounded-t-2xl" />
            <Section className="px-[32px] mb-[24px]">
              <Section className="w-[48px] h-[48px] border border-solid border-gray-300 rounded-full bg-gray-100 mx-auto">
                <Img
                  src={`https://infisical.com/_next/image?url=%2Fimages%2Flogo-black.png&w=64&q=75`}
                  width="32"
                  alt="Vercel Logo"
                  className="mx-auto"
                />
              </Section>
              {/* <Text className="inline-block pl-[4px] mb-[2px]">Infisical</Text> */}
            </Section>
            <Section className="px-[28px] bg-white">
              <Heading className="text-black text-[18px] leading-[22px] text-center font-normal p-0 mx-0">
                You've been invited to join
                <br />
                <strong>{orgName}</strong> on <strong>Infisical</strong>
              </Heading>
              <Section className="px-[24px] mt-[36px] py-[12px] border text-center border-solid border-gray-200 rounded-md bg-gray-50">
                <Text className="text-black text-[16px] leading-[24px]">
                  <strong>{invitingUserName}</strong> (
                  <Link href={`mailto:${invitingUserEmail}`} className="text-slate-500 no-underline">
                    {invitingUserEmail}
                  </Link>
                  ) has invited you to collaborate on <strong>{orgName}</strong> on <strong>Infisical</strong>.
                </Text>
              </Section>

              <Section className="text-center mt-[28px]">
                <Button
                  href={`${callbackUrl}?token=${token}${metadata ? `&metadata=${metadata}` : ""}&to=${inviteeEmail}$&organization_id=${orgId}`}
                  className="rounded-md p-3 px-[28px] my-[8px] text-center text-[16px] bg-[#c2d62b] text-black font-medium"
                >
                  Accept Invite
                </Button>
              </Section>

              <Section className="mt-[24px] bg-gray-50  py-[8px] border border-solid border-gray-200 px-[16px] rounded-md text-gray-800">
                <Text className="mb-[0px]">
                  <strong>About Infisical:</strong>
                </Text>
                <Hr className="border-[#e0ed34] bg-[#e0ed34] mt-[8px] mb-[0px] h-[1px]" />
                <Text>
                  Infisical is an all-in-one platform to securely manage application secrets, certificates, SSH keys,
                  and configurations across your team and infrastructure.
                </Text>
              </Section>
            </Section>
            <Hr className=" mt-[32px] mb-[0px] h-[1px]" />
            <Section className="px-[24px] text-center">
              <Text className="text-gray-500 text-[12px]">
                Email sent via Infisical at <strong className="text-[#c2d62b]">https://app.infisical.com</strong>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

interface VercelInviteUserEmailProps {
  username?: string;
  userImage?: string;
  invitedByUsername?: string;
  invitedByEmail?: string;
  teamName?: string;
  teamImage?: string;
  inviteLink?: string;
  inviteFromIp?: string;
  inviteFromLocation?: string;
}

const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";

export const VercelInviteUserEmail = ({
  username,
  userImage,
  invitedByUsername,
  invitedByEmail,
  teamName,
  teamImage,
  inviteLink,
  inviteFromIp,
  inviteFromLocation
}: VercelInviteUserEmailProps) => {
  const previewText = `Join ${invitedByUsername} on Vercel`;

  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans px-2">
          <Preview>{previewText}</Preview>
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            <Section className="mt-[32px]">
              <Img
                src={`${baseUrl}/static/vercel-logo.png`}
                width="40"
                height="37"
                alt="Vercel Logo"
                className="my-0 mx-auto"
              />
            </Section>
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              Join <strong>{teamName}</strong> on <strong>Vercel</strong>
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">Hello {username},</Text>
            <Text className="text-black text-[14px] leading-[24px]">
              <strong>{invitedByUsername}</strong> (
              <Link href={`mailto:${invitedByEmail}`} className="text-blue-600 no-underline">
                {invitedByEmail}
              </Link>
              ) has invited you to the <strong>{teamName}</strong> team on <strong>Vercel</strong>.
            </Text>
            <Section>
              <Row>
                <Column align="right">
                  <Img
                    className="rounded-full"
                    src={userImage}
                    width="64"
                    height="64"
                    alt={`${username}'s profile picture`}
                  />
                </Column>
                <Column align="center">
                  <Img
                    src={`${baseUrl}/static/vercel-arrow.png`}
                    width="12"
                    height="9"
                    alt="Arrow indicating invitation"
                  />
                </Column>
                <Column align="left">
                  <Img className="rounded-full" src={teamImage} width="64" height="64" alt={`${teamName} team logo`} />
                </Column>
              </Row>
            </Section>
            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={inviteLink}
              >
                Join the team
              </Button>
            </Section>
            <Text className="text-black text-[14px] leading-[24px]">
              or copy and paste this URL into your browser:{" "}
              <Link href={inviteLink} className="text-blue-600 no-underline">
                {inviteLink}
              </Link>
            </Text>
            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
            <Text className="text-[#666666] text-[12px] leading-[24px]">
              This invitation was intended for <span className="text-black">{username}</span>. This invite was sent from{" "}
              <span className="text-black">{inviteFromIp}</span> located in{" "}
              <span className="text-black">{inviteFromLocation}</span>. If you were not expecting this invitation, you
              can ignore this email. If you are concerned about your account's safety, please reply to this email to get
              in touch with us.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default PlaidVerifyIdentityEmail;

PlaidVerifyIdentityEmail.PreviewProps = {
  orgName: "Example Organization",
  invitingUserName: "Jane",
  invitingUserEmail: "jane@infisical.com"
} as PlaidVerifyIdentityEmailProps;
