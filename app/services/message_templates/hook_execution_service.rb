class MessageTemplates::HookExecutionService
  pattr_initialize [:message!]

  def perform
    return if inbox.agent_bot_inbox&.active?

    ::MessageTemplates::Template::OutOfOffice.new(conversation: conversation).perform if should_send_out_of_office_message?
    ::MessageTemplates::Template::Greeting.new(conversation: conversation).perform if should_send_greeting?
    ::MessageTemplates::Template::EmailCollect.new(conversation: conversation).perform if should_send_email_collect?
    execute_account_workflow_templates
  end

  private

  delegate :inbox, :conversation, to: :message
  delegate :contact, to: :conversation

  def should_send_out_of_office_message?
    inbox.out_of_office? && conversation.messages.today.template.empty? && inbox.out_of_office_message.present?
  end

  def first_message_from_contact?
    conversation.messages.outgoing.count.zero? && conversation.messages.template.count.zero?
  end

  def should_send_greeting?
    first_message_from_contact? && inbox.greeting_enabled? && inbox.greeting_message.present?
  end

  def email_collect_was_sent?
    conversation.messages.where(content_type: 'input_email').present?
  end

  def should_send_email_collect?
    !contact_has_email? && inbox.web_widget? && !email_collect_was_sent?
  end

  def contact_has_email?
    contact.email
  end

  def execute_account_workflow_templates
    # TODO: clean up this logic
    conversation.inbox.workflow_account_inbox_templates.each do |inbox_template|
      if inbox_template.account_template.template_id == 'csat'
        ::MessageTemplates::Template::Csat.new(message: message, account_template: inbox_template.account_template).perform
      end
    end
  end
end
