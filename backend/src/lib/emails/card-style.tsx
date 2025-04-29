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
          <Container className="border bg-gray-50 border-solid  border-gray-200 rounded-md my-[40px] mx-auto p-[32px] pb-[12px] max-w-[465px]">
            <Section className="mt-[12px] mb-[8px]">
              <Img
                src={`https://infisical.com/_next/image?url=%2Fimages%2Flogo-black.png&w=64&q=75`}
                width="32"
                alt="Vercel Logo"
                className="mb-[8px]"
              />
              {/* <Text className="inline-block pl-[4px] mb-[2px]">Infisical</Text> */}
            </Section>
            <Hr />
            <Heading className="text-black text-[20px] text-center font-normal p-0 my-[32px] mx-0">
              Join <strong>{orgName}</strong> on <strong>Infisical</strong>
            </Heading>
            <Section className="p-[24px] border text-center border-solid border-gray-200 rounded-md bg-gray-100">
              <Text className="text-black text-[16px] leading-[24px]">
                <strong>{invitingUserName}</strong> (
                <Link href={`mailto:${invitingUserEmail}`} className="text-slate-500 no-underline">
                  {invitingUserEmail}
                </Link>
                ) has invited you to <strong>{orgName}</strong> on <strong>Infisical</strong>.
              </Text>
              <Button
                href={`${callbackUrl}?token=${token}${metadata ? `&metadata=${metadata}` : ""}&to=${inviteeEmail}$&organization_id=${orgId}`}
                className="rounded p-3 mx-auto mt-[8px] text-[16px] bg-black text-white"
              >
                Join {orgName}
              </Button>
            </Section>
            <Section className="mt-[16px] text-gray-800">
              <Text className="mb-[0px]">
                <strong>About Infisical:</strong>
              </Text>
              <Text>
                Infisical is an all-in-one platform to securely manage application secrets, certificates, SSH keys, and
                configurations across your team and infrastructure.
              </Text>
            </Section>
            <Hr />
            <Text className="text-gray-400 text-[12px]">Email sent via Infisical at https://app.infisical.com</Text>
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
