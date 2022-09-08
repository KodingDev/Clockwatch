import { $field, Child, createElement, Embed, Message } from "slshx";
import { APIEmbedField } from "discord-api-types/v9";

const AUTHOR_IMAGE =
  "https://cdn.discordapp.com/avatars/1017030181078183966/b94814966373747feac0f6fe29167402.png?size=64";

export enum ResponseType {
  Error = 0xef5350,
  Success = 0x66bb6a,
  Info = 0x42a5f5,
}

type EmbedChild = (
  | Child
  | (APIEmbedField & {
      [$field]: true;
    })
)[];

export const ResponseMessage = (props: {
  title?: string;
  children?: EmbedChild;
  type: ResponseType | null;
  ephemeral?: boolean;
}) => (
  <Message ephemeral={props.ephemeral ?? true}>
    <Embed
      author={
        props.title && {
          name: props.title,
          iconUrl: AUTHOR_IMAGE,
        }
      }
      color={props.type ?? ResponseType.Info}
    >
      {props.children}
    </Embed>
  </Message>
);

export const ErrorMessage = (props: {
  children?: EmbedChild;
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
  title?: string;
  children?: EmbedChild;
  ephemeral?: boolean;
}) => (
  <ResponseMessage
    title={props.title}
    type={ResponseType.Success}
    ephemeral={props.ephemeral ?? false}
  >
    {props.children}
  </ResponseMessage>
);

export const InfoMessage = (props: {
  title?: string;
  children?: EmbedChild;
  ephemeral?: boolean;
}) => (
  <ResponseMessage
    title={props.title}
    type={ResponseType.Info}
    ephemeral={props.ephemeral ?? false}
  >
    {props.children}
  </ResponseMessage>
);
