import {
  $field,
  Child,
  createElement,
  Embed,
  EmbedProps,
  Message,
} from "slshx";
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

export const ResponseMessage = (
  props: {
    children?: EmbedChild;
    type: ResponseType | null;
    ephemeral?: boolean;
  } & EmbedProps,
) => (
  <Message ephemeral={props.ephemeral ?? true}>
    <Embed
      {...props}
      author={
        typeof props.author === "string"
          ? {
              name: props.author,
              iconUrl: AUTHOR_IMAGE,
            }
          : props.author
      }
      color={props.type ?? ResponseType.Info}
    >
      {props.children}
    </Embed>
  </Message>
);

export const ErrorMessage = (
  props: {
    children?: EmbedChild;
    ephemeral?: boolean;
  } & EmbedProps,
) => (
  <ResponseMessage {...props} author="Error" type={ResponseType.Error}>
    {props.children}
  </ResponseMessage>
);

export const SuccessMessage = (
  props: {
    children?: EmbedChild;
    ephemeral?: boolean;
  } & EmbedProps,
) => (
  <ResponseMessage ephemeral={false} {...props} type={ResponseType.Success}>
    {props.children}
  </ResponseMessage>
);

export const InfoMessage = (
  props: {
    children?: EmbedChild;
    ephemeral?: boolean;
  } & EmbedProps,
) => (
  <ResponseMessage {...props} type={ResponseType.Info}>
    {props.children}
  </ResponseMessage>
);
