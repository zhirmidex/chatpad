import {
  Badge,
  Button,
  Center,
  Container,
  Group,
  SimpleGrid,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  IconBook,
  IconBulb,
  IconCloudDownload,
  IconCurrencyDollar,
  IconKey,
  IconLock,
  IconNorthStar,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useLiveQuery } from "dexie-react-hooks";
import { Logo } from "../components/Logo";
import { SettingsModal } from "../components/SettingsModal";
import { db } from "../db";

export function IndexRoute() {
  const settings = useLiveQuery(() => db.settings.get("general"));
  const { openAiApiKey } = settings ?? {};

  return (
    <>
      <Center py="xl" sx={{ height: "100%" }}>
        <Container size="sm">
          {/* <Badge mb="lg">GPT-4 Ready</Badge> */}
          <Text style={{fontSize: '44px',
fontWeight: '500'}}>
          Smplyr Onli.ai
            {/* <p style={{ maxWidth: 240 }} /> */}
          </Text>
          <Text mt={4} size="xl">
          I am Smplyr an AI that makes Onli simpler
          </Text>
          <SimpleGrid
            mt={50}
            cols={3}
            spacing={30}
            breakpoints={[{ maxWidth: "md", cols: 1 }]}
          >
            {features.map((feature) => (
              <div key={feature.title}>
                <ThemeIcon color="blue" size={50} radius={50}>
                  <feature.icon size={26} stroke={1.5} />
                </ThemeIcon>
                <Text mt="sm" mb={7}>
                  {feature.title}
                </Text>
                <Text size="sm" color="dimmed" sx={{ lineHeight: 1.6 }}>
                  {feature.description}
                </Text>
              </div>
            ))}
          </SimpleGrid>
          <Group mt={50}>
            <SettingsModal>
              <Button
                size="md"
               color ={openAiApiKey ? "blue" : "blue"}
                leftIcon={<IconKey size={20} />}
              >
                {openAiApiKey ? "Change OpenAI Key" : "Enter OpenAI Key"}
              </Button>
            </SettingsModal>
            {/* {!window.todesktop && (
              <Button
                component="a"
                href="https://dl.todesktop.com/230313oyppkw40a"
                // href="https://download.chatpad.ai/"
                size="md"
                variant="outline"
                leftIcon={<IconCloudDownload size={20} />}
              >
                Download Desktop App
              </Button>
            )} */}
          </Group>
        </Container>
      </Center>
    </>
  );
}

const features = [
  {
    icon: IconBulb,
    title: "  DISCOVER",
    description:
      " I am Smplyr an AI that makes Onli simpler.",
  },
  {
    icon: IconBook,
    title: "LEARN",
    description:
      "I am Smplyr an AI that makes Onli simpler.",
  },
  {
    icon: IconPlayerPlay,
    title: "PLAY",
    description:
      " I am Smplyr an AI that makes Onli simpler.",
  },
];
