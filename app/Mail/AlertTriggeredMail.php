<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AlertTriggeredMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * @param  array<string, mixed>  $alert
     */
    public function __construct(public array $alert)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Alerta SMAF2: {$this->alert['clientName']} · {$this->alert['account']}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.alert-triggered',
            with: ['alert' => $this->alert],
        );
    }
}
