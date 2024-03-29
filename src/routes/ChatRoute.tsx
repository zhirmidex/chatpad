import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  MediaQuery,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Textarea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useLiveQuery } from "dexie-react-hooks";
import { findLast } from "lodash";
import { nanoid } from "nanoid";
import { useState } from "react";
import { AiOutlineSend } from "react-icons/ai";
import { MessageItem } from "../components/MessageItem";
import { db } from "../db";
import { useChatId } from "../hooks/useChatId";
import {
  writingCharacters,
  writingFormats,
  writingStyles,
  writingTones,
} from "../utils/constants";
import { createChatCompletion } from "../utils/openai";
import './Style.css';
export function ChatRoute() {
  const chatId = useChatId();
  const apiKey = useLiveQuery(async () => {
    return (await db.settings.where({ id: "general" }).first())?.openAiApiKey;
  });
  const messages = useLiveQuery(() => {
    if (!chatId) return [];
    return db.messages.where("chatId").equals(chatId).sortBy("createdAt");
  }, [chatId]);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const chat = useLiveQuery(async () => {
    if (!chatId) return null;
    return db.chats.get(chatId);
  }, [chatId]);

  const [writingCharacter, setWritingCharacter] = useState<string | null>(null);
  const [writingTone, setWritingTone] = useState<string | null>(null);
  const [writingStyle, setWritingStyle] = useState<string | null>(null);
  const [writingFormat, setWritingFormat] = useState<string | null>(null);

  const getSystemMessage = () => {
    const message: string[] = [];
    if (writingCharacter) message.push(`You are ${writingCharacter}.`);
    if (writingTone) message.push(`Respond in ${writingTone} tone.`);
    if (writingStyle) message.push(`Respond in ${writingStyle} style.`);
    if (writingFormat) message.push(writingFormat);
    if (message.length === 0)
      message.push(
        "You are ChatGPT, a large language model trained by OpenAI."
      );
    return message.join(" ");
  };

  const submit = async () => {
    if (submitting) return;

    if (!chatId) {
      notifications.show({
        title: "Error",
        color: "red",
        message: "chatId is not defined. Please create a chat to get started.",
      });
      return;
    }

    if (!apiKey) {
      notifications.show({
        title: "Error",
        color: "red",
        message: "OpenAI API Key is not defined. Please set your API Key",
      });
      return;
    }

    try {
      setSubmitting(true);

      await db.messages.add({
        id: nanoid(),
        chatId,
        content,
        role: "user",
        createdAt: new Date(),
      });
      setContent("");

      const result = await createChatCompletion(apiKey, [
        {
          role: "system",
          content: getSystemMessage(),
        },
        ...(messages ?? []).map((message) => ({
          role: message.role,
          content: message.content,
        })),
        { role: "user", content },
      ]);

      const assistantMessage = result.data.choices[0].message?.content;
      if (result.data.usage) {
        await db.chats.where({ id: chatId }).modify((chat) => {
          if (chat.totalTokens) {
            chat.totalTokens += result.data.usage!.total_tokens;
          } else {
            chat.totalTokens = result.data.usage!.total_tokens;
          }
        });
      }
      setSubmitting(false);

      await db.messages.add({
        id: nanoid(),
        chatId,
        content: assistantMessage ?? "unknown reponse",
        role: "assistant",
        createdAt: new Date(),
      });

      if (chat?.description === "New Chat") {
        const messages = await db.messages
          .where({ chatId })
          .sortBy("createdAt");
        const createChatDescription = await createChatCompletion(apiKey, [
          {
            role: "system",
            content: getSystemMessage(),
          },
          ...(messages ?? []).map((message) => ({
            role: message.role,
            content: message.content,
          })),
          {
            role: "user",
            content:
              "What would be a short and relevant title for this chat ? You must strictly answer with only the title, no other text is allowed.",
          },
        ]);
        const chatDescription =
          createChatDescription.data.choices[0].message?.content;

        if (createChatDescription.data.usage) {
          await db.chats.where({ id: chatId }).modify((chat) => {
            chat.description = chatDescription ?? "New Chat";
            if (chat.totalTokens) {
              chat.totalTokens +=
                createChatDescription.data.usage!.total_tokens;
            } else {
              chat.totalTokens = createChatDescription.data.usage!.total_tokens;
            }
          });
        }
      }
    } catch (error: any) {
      if (error.toJSON().message === "Network Error") {
        notifications.show({
          title: "Error",
          color: "red",
          message: "No internet connection.",
        });
      }
      const message = error.response?.data?.error?.message;
      if (message) {
        notifications.show({
          title: "Error",
          color: "red",
          message,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!chatId) return null;

  return (
    <>
      <Container pt="xl" pb={100}>
        <Stack spacing="xs">
          {messages?.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}
        </Stack>
        {submitting && (
          <Card withBorder mt="xs">
            <Skeleton height={8} radius="xl" />
            <Skeleton height={8} mt={6} radius="xl" />
            <Skeleton height={8} mt={6} radius="xl" />
            <Skeleton height={8} mt={6} radius="xl" />
            <Skeleton height={8} mt={6} width="70%" radius="xl" />
          </Card>
        )}
      </Container>
      <Box
        py="lg"
        sx={(theme) => ({
          // position: "fixed",
          marginTop:"90px",
          bottom: 0,
          left: 0,
          right: 0,
          [`@media (min-width: ${theme.breakpoints.md})`]: {
            left: 300,
          },
          backgroundColor:
            theme.colorScheme === "dark"
              ? theme.colors.dark[9]
              : theme.colors.gray[0],
        })}
      >
        <Container>
          {messages?.length === 0 && (
            <SimpleGrid
              mb="sm"
              spacing="xs"
              breakpoints={[
                { minWidth: "sm", cols: 4 },
                { maxWidth: "sm", cols: 2 },
              ]}
            >
              <Select
                value={writingCharacter}
                onChange={setWritingCharacter}
                data={writingCharacters}
                placeholder="Prompts: About Onli "
                variant="filled"
                searchable
                clearable
                sx={{ flex: 1 }}
              />
              <Select
                value={writingTone}
                onChange={setWritingTone}
                data={writingTones}
                placeholder="Prompts: About Products "
                variant="filled"
                searchable
                clearable
                sx={{ flex: 1 }}
              />
              <Select
                value={writingStyle}
                onChange={setWritingStyle}
                data={writingStyles}
                placeholder="Prompts: How to "
                variant="filled"
                searchable
                clearable
                sx={{ flex: 1 }}
              />
              <Select
                value={writingFormat}
                onChange={setWritingFormat}
                data={writingFormats}
                placeholder="Prompts: Sandbox"
                variant="filled"
                searchable
                clearable
                sx={{ flex: 1 }}
              />
            </SimpleGrid>
          )}
          
          <Flex gap="sm">
            <Textarea
              key={chatId}
              sx={{ flex: 1 }}
              placeholder="Ask me a question? need help use the menu above..."
              autosize
              autoFocus
              disabled={submitting}
              minRows={1}
              maxRows={5}
              value={content}
              onChange={(event) => setContent(event.currentTarget.value)}
              onKeyDown={async (event) => {
                if (event.code === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
                if (event.code === "ArrowUp") {
                  const { selectionStart, selectionEnd } = event.currentTarget;
                  if (selectionStart !== selectionEnd) return;
                  if (selectionStart !== 0) return;
                  event.preventDefault();
                  const nextUserMessage = findLast(
                    messages,
                    (message) => message.role === "user"
                  );
                  setContent(nextUserMessage?.content ?? "");
                }
                if (event.code === "ArrowDown") {
                  const { selectionStart, selectionEnd } = event.currentTarget;
                  if (selectionStart !== selectionEnd) return;
                  if (selectionStart !== event.currentTarget.value.length)
                    return;
                  event.preventDefault();
                  const lastUserMessage = findLast(
                    messages,
                    (message) => message.role === "user"
                  );
                  if (lastUserMessage?.content === content) {
                    setContent("");
                  }
                }
              }}
              
            />
            
            <MediaQuery largerThan="sm" styles={{ display: "none" }}>
              <Button
                h="auto"
                onClick={() => {
                  submit();
                }}
              >
                
                <AiOutlineSend />

              </Button>
            </MediaQuery>
          </Flex>
     <Container>   <div className="card" style={{marginLeft:20}}>
        <button style={{marginTop:'4px',paddingTop:'2px',paddingRight:'2px' }}>
         <div className="topside"><p style={{color:'#D52828', paddingBottom:'18px',paddingRight:'91px',}}>Treasury</p>
         <div className="subtopside1" style={{marginLeft:'10px'}}>
          <p style={{marginLeft:'-37px', color:'#464646'}}>Balance</p>
           <p  style={{color:'#8F908F', fontSize:'12px', fontWeight:'400'}}
           >Ø 1,000,000,000
           </p>
           </div>
           </div>
        <div className="bottomside"> 
        <h1 style={{color:'#8F908F',fontSize:'5px',fontWeight:'500px',paddingRight:'34px',marginTop:'20px'}}>
          IP 234.234.222.61
          </h1>
           <div className="subbottomside1" style={{paddingRight:'53px'}}><p style={{color:'#464646', fontSize:'6px', fontWeight:'500',marginTop:'20px'}}>
            ENABLED
            </p>
           <p style={{color:'#8F908F', fontSize:'4px', fontWeight:'500'}}>
            LINK CONNECTION
            </p>
            </div>
           <div className="subbottomside2" style={{paddingBottom:'10px',marginTop:'5px'}}>
            <p style={{color:'#464646', fontSize:'10px', fontWeight:'500',marginLeft:'-37px'}}>CONFIG

            </p>
           <p style={{color:'#8F908F', fontSize:'10px', fontWeight:'500'}}>IP 34.234.222.61
            </p>
            </div>
           </div>
         </button>
         <button style={{marginTop:'4px',paddingTop:'2px',paddingRight:'2px' , }}>
         <div className="topside"><p style={{color:'#6DD400', paddingBottom:'18px',paddingRight:'91px',}}>Users</p>
         <div className="subtopside1" style={{marginLeft:'32px'}}>
          <p style={{marginLeft:'-37px', color:'#464646'}}>Balance</p>
           <p  style={{color:'#8F908F', fontSize:'12px', fontWeight:'400'}}
           >Ø 1,000,000,000
           </p>
           </div>
           </div>
        <div className="bottomside"> 
        <h1 style={{color:'#8F908F',fontSize:'5px',fontWeight:'500px',paddingRight:'34px',marginTop:'20px'}}>
          IP 234.234.222.61
          </h1>
           <div className="subbottomside1" style={{paddingRight:'53px'}}><p style={{color:'#464646', fontSize:'6px', fontWeight:'500',marginTop:'20px'}}>
            ENABLED
            </p>
           <p style={{color:'#8F908F', fontSize:'4px', fontWeight:'500'}}>
            LINK CONNECTION
            </p>
            </div>
           <div className="subbottomside2" style={{paddingBottom:'10px',marginTop:'5px'}}>
            <p style={{color:'#464646', fontSize:'10px', fontWeight:'500',marginLeft:'-37px'}}>CONFIG

            </p>
           <p style={{color:'#8F908F', fontSize:'10px', fontWeight:'500'}}>IP 34.234.222.61
            </p>
            </div>
           </div>
         </button>
         <button style={{marginTop:'4px',paddingTop:'2px',paddingRight:'2px', }}>
         <div className="topside"><p style={{color:'#D52828', paddingBottom:'18px',paddingRight:'91px',}}>Sub Accounts</p>
         <div className="subtopside1" style={{marginLeft:'px'}}>
          <p style={{marginLeft:'-37px', color:'#464646'}}>Balance</p>
           <p  style={{color:'#8F908F', fontSize:'12px', fontWeight:'400'}}
           >Ø 1,000,000,000
           </p>
           </div>
           </div>
        <div className="bottomside"> 
        <h1 style={{color:'#8F908F',fontSize:'5px',fontWeight:'500px',paddingRight:'34px',marginTop:'20px'}}>
          IP 234.234.222.61
          </h1>
           <div className="subbottomside1" style={{paddingRight:'53px'}}><p style={{color:'#464646', fontSize:'6px', fontWeight:'500',marginTop:'20px'}}>
            ENABLED
            </p>
           <p style={{color:'#8F908F', fontSize:'4px', fontWeight:'500'}}>
            LINK CONNECTION
            </p>
            </div>
           <div className="subbottomside2" style={{paddingBottom:'10px',marginLeft:'20px', marginTop:'5px'}}>
            <p style={{color:'#464646', fontSize:'10px', fontWeight:'500',marginLeft:'-37px'}}>CONFIG

            </p>
           <p style={{color:'#8F908F', fontSize:'10px', fontWeight:'500'}}>IP 34.234.222.61
            </p>
            </div>
           </div>
         </button>
        </div>
         
         </Container>
        </Container>
        
      </Box>
     
    </>
  );
}
