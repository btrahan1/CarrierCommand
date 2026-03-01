using System.Text.Json.Serialization;

namespace CarrierCommand.Models;

public class UnitStatus
{
    [JsonPropertyName("id")]
    public string Id { get; set; }
    [JsonPropertyName("state")]
    public string State { get; set; }
    [JsonPropertyName("hp")]
    public double Hp { get; set; }
    [JsonPropertyName("maxHp")]
    public double MaxHp { get; set; }
}
