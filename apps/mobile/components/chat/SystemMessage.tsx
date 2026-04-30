import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { MessagesType } from '@/types/messages.type';
import { formatTime } from '@/utils/format-message-time..util';

interface Props {
  message: MessagesType;
}

const SystemMessage: React.FC<Props> = ({ message }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {message.content?.text}
      </Text>
      {message.createdAt && (
        <Text style={styles.time}>{formatTime(message.createdAt)}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
    paddingHorizontal: 40,
  },
  text: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  time: {
    fontSize: 10,
    color: '#d1d5db',
    fontWeight: '400',
    marginTop: 2,
  },
});

export default SystemMessage;
