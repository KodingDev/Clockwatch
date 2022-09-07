import { Child, createElement, Embed, Message } from "slshx";

export enum ResponseType {
  Error = 0xef5350,
  Success = 0x66bb6a,
  Info = 0x42a5f5,
}

export const ResponseMessage = (props: {
  title: string;
  children?: Child;
  type: ResponseType | null;
  ephemeral?: boolean;
}) => (
  // Title is silently ignored for the moment
  <Message ephemeral={props.ephemeral ?? true}>
    <Embed color={props.type ?? ResponseType.Info}>{props.children}</Embed>
  </Message>
);

export const ErrorMessage = (props: {
  children?: Child;
  ephemeral?: boolean;
}) => (
  <ResponseMessage
    title="Error"
    type={ResponseType.Error}
    ephemeral={props.ephemeral}
  >
    {props.children}
  </ResponseMessage>
);

export const SuccessMessage = (props: {
  children?: Child;
  ephemeral?: boolean;
}) => (
  <ResponseMessage
    title="Success"
    type={ResponseType.Success}
    ephemeral={props.ephemeral}
  >
    {props.children}
  </ResponseMessage>
);

export const InfoMessage = (props: {
  children?: Child;
  ephemeral?: boolean;
}) => (
  <ResponseMessage
    title="Info"
    type={ResponseType.Info}
    ephemeral={props.ephemeral}
  >
    {props.children}
  </ResponseMessage>
);
