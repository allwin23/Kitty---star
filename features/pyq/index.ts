// PYQ feature – re-export relevant schemas from the central activity schemas module
export {
  pyqAttemptSchema,
  pyqAttemptAnswerSchema,
  pyqStartSchema,
  pyqFinishSchema,
  type PyqAttemptInput,
  type PyqAttemptAnswerInput,
  type PyqStartInput,
  type PyqFinishInput,
} from '@/features/activity';
